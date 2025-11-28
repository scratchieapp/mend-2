import { useState, useEffect } from "react";
import { FormField, FormItem } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, FileText, Plus, Pencil, Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useParams } from "react-router-dom";
import type { IncidentReportFormData, IncidentEditFormData } from "@/lib/validations/incident";

interface CaseNote {
  id: number;
  incident_id: number;
  note_text: string;
  created_by: string;
  created_at: string;
  updated_at: string | null;
  is_edited: boolean;
}

interface CaseNotesSectionProps {
  form: UseFormReturn<IncidentReportFormData> | UseFormReturn<IncidentEditFormData>;
}

export function CaseNotesSection({ form }: CaseNotesSectionProps) {
  const { id } = useParams<{ id: string }>();
  const { userData } = useAuth();
  const [caseNotes, setCaseNotes] = useState<CaseNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");

  // Check if call_transcripts field exists (only in edit schema)
  const callTranscripts = useWatch({
    control: form.control,
    name: "call_transcripts" as keyof IncidentEditFormData,
  });

  const hasCallTranscripts = callTranscripts && callTranscripts.trim().length > 0;
  const incidentId = id ? parseInt(id) : null;

  // Fetch case notes for this incident
  useEffect(() => {
    if (!incidentId) return;
    
    const fetchNotes = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_case_notes', {
          p_incident_id: incidentId
        });
        
        if (error) throw error;
        setCaseNotes(data || []);
      } catch (error) {
        console.error('Error fetching case notes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchNotes();
  }, [incidentId]);

  // Add a new note
  const handleAddNote = async () => {
    if (!newNote.trim() || !incidentId) return;
    
    try {
      const userName = userData?.custom_display_name || userData?.display_name || userData?.email || 'Unknown User';
      
      const { data, error } = await supabase.rpc('add_case_note', {
        p_incident_id: incidentId,
        p_note_text: newNote.trim(),
        p_created_by: userName,
        p_created_by_user_id: userData?.user_id || null
      });
      
      if (error) throw error;
      
      // Add the new note to the list
      const newNoteData: CaseNote = {
        id: data.id,
        incident_id: data.incident_id,
        note_text: data.note_text,
        created_by: data.created_by,
        created_at: data.created_at,
        updated_at: null,
        is_edited: false
      };
      
      setCaseNotes(prev => [newNoteData, ...prev]);
      setNewNote("");
      setIsAdding(false);
      toast.success('Note added');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    }
  };

  // Update an existing note
  const handleUpdateNote = async (noteId: number) => {
    if (!editingText.trim()) return;
    
    try {
      const { data, error } = await supabase.rpc('update_case_note', {
        p_note_id: noteId,
        p_note_text: editingText.trim()
      });
      
      if (error) throw error;
      
      // Update the note in the list
      setCaseNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, note_text: data.note_text, updated_at: data.updated_at, is_edited: true }
          : note
      ));
      
      setEditingNoteId(null);
      setEditingText("");
      toast.success('Note updated');
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  const startEditing = (note: CaseNote) => {
    setEditingNoteId(note.id);
    setEditingText(note.note_text);
  };

  const cancelEditing = () => {
    setEditingNoteId(null);
    setEditingText("");
  };

  return (
    <div className="space-y-6">
      {/* Call Transcripts Section - Read-only display of voice agent transcripts */}
      {'call_transcripts' in (form.getValues() || {}) && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              Call Transcripts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Transcripts from voice agent calls related to this incident
            </p>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name={"call_transcripts" as keyof IncidentEditFormData}
              render={({ field }) => (
                <FormItem>
                  {hasCallTranscripts ? (
                    <div className="bg-white rounded-md border p-4 max-h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono text-gray-700">
                        {field.value as string}
                      </pre>
                    </div>
                  ) : (
                    <div className="bg-white rounded-md border p-4 text-center text-muted-foreground">
                      <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No call transcripts available for this incident.</p>
                      <p className="text-xs mt-1">Transcripts will appear here when incidents are reported via voice agent.</p>
                    </div>
                  )}
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      )}

      {/* Progressive Case Notes Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-600" />
                Case Notes
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Add notes about follow-ups, communications, or case management
              </p>
            </div>
            {incidentId && !isAdding && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => setIsAdding(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new note form */}
          {isAdding && (
            <div className="border rounded-lg p-4 bg-green-50/50 border-green-200">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Enter your note..."
                className="min-h-[100px] bg-white"
              />
              <div className="flex gap-2 mt-3">
                <Button type="button" size="sm" onClick={handleAddNote} disabled={!newNote.trim()}>
                  <Check className="h-4 w-4 mr-1" />
                  Save Note
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setIsAdding(false); setNewNote(""); }}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Existing notes list */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
          ) : caseNotes.length > 0 ? (
            <div className="space-y-3">
              {caseNotes.map((note) => (
                <div key={note.id} className="border rounded-lg p-4 bg-gray-50/50">
                  {editingNoteId === note.id ? (
                    <div>
                      <Textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="min-h-[100px] bg-white"
                      />
                      <div className="flex gap-2 mt-3">
                        <Button type="button" size="sm" onClick={() => handleUpdateNote(note.id)} disabled={!editingText.trim()}>
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                          <span>•</span>
                          <span className="font-medium">{note.created_by}</span>
                          {note.is_edited && (
                            <>
                              <span>•</span>
                              <span className="italic text-xs">
                                (edited {note.updated_at ? format(new Date(note.updated_at), 'MMM d, h:mm a') : ''})
                              </span>
                            </>
                          )}
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => startEditing(note)}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{note.note_text}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : incidentId ? (
            <div className="text-center py-8 text-muted-foreground border rounded-lg bg-gray-50/30">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No case notes yet.</p>
              <p className="text-xs mt-1">Click "Add Note" to create the first note.</p>
            </div>
          ) : (
            /* For new incidents (no ID yet), show the simple textarea */
            <FormField
              control={form.control}
              name="case_notes"
              render={({ field }) => (
                <FormItem>
                  <Textarea 
                    {...field} 
                    value={field.value || ''}
                    id="case_notes" 
                    className="min-h-[150px]" 
                    placeholder="Enter case notes, follow-up actions, communications with worker/employer, etc."
                  />
                </FormItem>
              )}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}