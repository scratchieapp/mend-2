import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Phone, PhoneOff, Mic, MicOff, Volume2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

// Retell Web SDK types
interface RetellWebClient {
  startCall(options: { accessToken: string; sampleRate?: number }): Promise<void>;
  stopCall(): void;
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback: (...args: any[]) => void): void;
}

interface UserContext {
  employer_id?: string;
  employer_name?: string;
  site_id?: string;
  site_name?: string;
  caller_name?: string;
  caller_role?: string;
  caller_position?: string;  // Position/title for reporting info
  caller_phone?: string;
  is_authenticated?: boolean;
}

interface RetellVoiceCallProps {
  agentId?: string;
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  className?: string;
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  showPhoneOption?: boolean;
  phoneNumber?: string;
  /** User context for authenticated users - passed as dynamic variables to skip questions */
  userContext?: UserContext;
}

type CallStatus = 'idle' | 'connecting' | 'active' | 'ending';

export function RetellVoiceCall({
  agentId,
  onCallStarted,
  onCallEnded,
  className,
  buttonText = 'Speak with Mend',
  buttonVariant = 'default',
  showPhoneOption = true,
  phoneNumber = '02 9136 2358',
  userContext
}: RetellVoiceCallProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const retellClientRef = useRef<RetellWebClient | null>(null);
  const sdkLoadedRef = useRef(false);

  // Dynamically load Retell SDK
  useEffect(() => {
    if (sdkLoadedRef.current) return;
    
    const loadSdk = async () => {
      try {
        // @ts-ignore - Dynamic import
        const { RetellWebClient } = await import('retell-client-js-sdk');
        retellClientRef.current = new RetellWebClient();
        sdkLoadedRef.current = true;
        console.log('Retell SDK loaded');
      } catch (err) {
        console.error('Failed to load Retell SDK:', err);
        setError('Voice calling is temporarily unavailable');
      }
    };
    
    loadSdk();
  }, []);

  const startCall = async () => {
    if (!retellClientRef.current) {
      setError('Voice system not ready. Please try again.');
      console.error('[VoiceCall] Retell SDK not loaded');
      return;
    }

    setCallStatus('connecting');
    setError(null);
    setTranscript([]);

    try {
      // Get Supabase URL from environment
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      console.log('[VoiceCall] Starting call...', {
        supabaseUrl: supabaseUrl ? 'configured' : 'MISSING',
        agentId: agentId || 'using default',
        hasUserContext: !!userContext,
        userContext: userContext ? {
          employer_name: userContext.employer_name,
          caller_name: userContext.caller_name,
          is_authenticated: userContext.is_authenticated,
        } : null,
      });
      
      if (!supabaseUrl) {
        throw new Error('Supabase not configured - VITE_SUPABASE_URL missing');
      }

      // Get access token from Supabase Edge Function
      const requestBody = { 
        agent_id: agentId,
        user_context: userContext 
      };
      
      console.log('[VoiceCall] Calling create-web-call edge function...');
      const startTime = Date.now();
      
      const { data: responseData, error: functionError } = await supabase.functions.invoke('create-web-call', {
        body: requestBody
      });

      const elapsed = Date.now() - startTime;

      if (functionError) {
        console.error('[VoiceCall] Edge function error:', functionError);
        
        // Parse error body if available
        let errorMessage = functionError.message;
        if (functionError instanceof Error && 'context' in functionError) {
             // @ts-ignore - supabase error context might have more info
             const context = functionError.context;
             if (context && typeof context === 'object' && 'json' in context) {
                 try {
                     const json = await context.json();
                     if (json.error) errorMessage = json.error;
                 } catch (e) { /* ignore */ }
             }
        }
        
        throw new Error(errorMessage || 'Failed to create web call');
      }

      console.log(`[VoiceCall] Edge function success (${elapsed}ms)`);
      const { access_token, call_id, diagnostics } = responseData;
      
      console.log('[VoiceCall] Web call created:', {
        call_id,
        hasAccessToken: !!access_token,
        diagnostics,
      });

      // Set up event listeners
      const client = retellClientRef.current;
      
      client.on('call_started', () => {
        console.log('Call started');
        setCallStatus('active');
        onCallStarted?.();
      });

      client.on('call_ended', () => {
        console.log('Call ended');
        setCallStatus('idle');
        onCallEnded?.();
      });

      client.on('agent_start_talking', () => {
        setIsAgentSpeaking(true);
      });

      client.on('agent_stop_talking', () => {
        setIsAgentSpeaking(false);
      });

      client.on('update', (update: any) => {
        if (update.transcript) {
          // Get the last few sentences
          const sentences = update.transcript.split(/[.!?]+/).filter(Boolean).slice(-3);
          setTranscript(sentences);
        }
      });

      client.on('error', (err: any) => {
        console.error('Retell error:', err);
        setError('Call failed. Please try again or call us directly.');
        setCallStatus('idle');
      });

      // Start the call
      await client.startCall({
        accessToken: access_token,
        sampleRate: 24000
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[VoiceCall] Failed to start call:', {
        error: errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
      
      // Provide helpful error messages based on the error type
      let userMessage = 'Unable to connect. Please try calling us directly.';
      if (errorMessage.includes('RETELL_API_KEY')) {
        userMessage = 'Voice service configuration issue. Please contact support.';
      } else if (errorMessage.includes('agent')) {
        userMessage = 'Voice agent not available. Please try calling us directly.';
      } else if (errorMessage.includes('HTTP 4')) {
        userMessage = 'Request error. Please refresh and try again.';
      } else if (errorMessage.includes('HTTP 5')) {
        userMessage = 'Server error. Please try again in a moment.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Network error. Please check your connection.';
      }
      
      setError(userMessage);
      setCallStatus('idle');
    }
  };

  const endCall = () => {
    if (retellClientRef.current && callStatus === 'active') {
      setCallStatus('ending');
      retellClientRef.current.stopCall();
    }
  };

  const toggleMute = () => {
    // Note: Retell SDK doesn't have built-in mute, would need to mute audio input
    setIsMuted(!isMuted);
  };

  const handleDialogClose = () => {
    if (callStatus === 'active') {
      endCall();
    }
    setIsDialogOpen(false);
    setError(null);
    setTranscript([]);
  };

  return (
    <>
      <Button 
        variant={buttonVariant}
        onClick={() => setIsDialogOpen(true)}
        className={cn("gap-2", className)}
      >
        <Phone className="h-4 w-4" />
        {buttonText}
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={cn(
                "h-3 w-3 rounded-full",
                callStatus === 'idle' && "bg-gray-400",
                callStatus === 'connecting' && "bg-yellow-400 animate-pulse",
                callStatus === 'active' && "bg-green-500",
                callStatus === 'ending' && "bg-orange-400"
              )} />
              {callStatus === 'idle' && 'Report an Incident'}
              {callStatus === 'connecting' && 'Connecting...'}
              {callStatus === 'active' && 'Connected to Mend'}
              {callStatus === 'ending' && 'Ending call...'}
            </DialogTitle>
            <DialogDescription>
              {callStatus === 'idle' 
                ? 'Speak directly with our AI assistant to report an incident or get help.'
                : 'Our assistant is ready to help you.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            {callStatus === 'idle' && (
              <div className="space-y-4">
                {/* Voice Call Option */}
                <div 
                  className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={startCall}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mic className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Start Voice Call</p>
                      <p className="text-sm text-muted-foreground">
                        Talk to our AI assistant now
                      </p>
                    </div>
                  </div>
                </div>

                {showPhoneOption && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    {/* Phone Call Option */}
                    <a 
                      href={`tel:${phoneNumber.replace(/\s/g, '')}`}
                      className="border rounded-lg p-4 block hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                          <Phone className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Call {phoneNumber}</p>
                          <p className="text-sm text-muted-foreground">
                            Available 24/7 for emergencies
                          </p>
                        </div>
                      </div>
                    </a>
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}
              </div>
            )}

            {callStatus === 'connecting' && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Connecting to Mend...</p>
              </div>
            )}

            {callStatus === 'active' && (
              <div className="space-y-4">
                {/* Voice visualization */}
                <div className="flex justify-center py-4">
                  <div className={cn(
                    "h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300",
                    isAgentSpeaking 
                      ? "bg-primary/20 scale-110" 
                      : "bg-primary/10"
                  )}>
                    <Volume2 className={cn(
                      "h-10 w-10 text-primary transition-all",
                      isAgentSpeaking && "animate-pulse"
                    )} />
                  </div>
                </div>

                {/* Live transcript */}
                {transcript.length > 0 && (
                  <div className="bg-muted/50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <p className="text-xs text-muted-foreground mb-1">Live transcript:</p>
                    <p className="text-sm">{transcript.join('. ')}...</p>
                  </div>
                )}

                {/* Call controls */}
                <div className="flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleMute}
                    className={cn(
                      "h-12 w-12 rounded-full",
                      isMuted && "bg-red-100 border-red-200"
                    )}
                  >
                    {isMuted ? <MicOff className="h-5 w-5 text-red-500" /> : <Mic className="h-5 w-5" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={endCall}
                    className="h-12 w-12 rounded-full"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            )}

            {callStatus === 'ending' && (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Ending call...</p>
              </div>
            )}
          </div>

          {callStatus === 'idle' && (
            <DialogFooter className="text-center text-xs text-muted-foreground">
              Your microphone will be used for the voice call.
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default RetellVoiceCall;

