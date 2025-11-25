import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface BodyInjuryViewerProps {
  selectedRegions: string[];
  injuryType?: string | null;
  injuryDescription?: string | null;
}

interface UIRegion {
  svg_id: string;
  view: 'front' | 'back';
  body_part_id: number | null;
  body_side_id: number | null;
  body_part?: { body_part_name: string };
  body_side?: { body_side_name: string };
}

export function BodyInjuryViewer({ 
  selectedRegions,
  injuryType,
  injuryDescription
}: BodyInjuryViewerProps) {
  // Fetch UI regions mapping from database
  const { data: uiRegions } = useQuery({
    queryKey: ['ui-regions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ui_regions')
        .select(`
          svg_id,
          view,
          body_part_id,
          body_side_id,
          body_parts!ui_regions_body_part_fk(body_part_name),
          body_sides!ui_regions_side_fk(body_side_name)
        `);
      
      if (error) throw error;
      return data as UIRegion[];
    },
  });

  const getRegionLabel = (regionId: string) => {
    const region = uiRegions?.find(r => r.svg_id === regionId);
    if (!region) return regionId;
    
    const parts = [];
    if (region.body_side?.body_side_name && region.body_side.body_side_name !== 'center') {
      parts.push(region.body_side.body_side_name.charAt(0).toUpperCase() + region.body_side.body_side_name.slice(1));
    }
    if (region.body_part?.body_part_name) {
      parts.push(region.body_part.body_part_name);
    }
    
    return parts.length > 0 ? parts.join(' ') : regionId;
  };

  // Professional anatomical body SVG
  const BodyDiagram = ({ view }: { view: 'front' | 'back' }) => {
    const isInjured = (regionId: string) => selectedRegions.includes(`${view}-${regionId}`);
    
    const getRegionStyle = (regionId: string) => {
      if (isInjured(regionId)) {
        return {
          fill: 'rgba(239, 68, 68, 0.5)',
          stroke: '#dc2626',
          strokeWidth: 2,
        };
      }
      return {
        fill: '#f1f5f9',
        stroke: '#94a3b8',
        strokeWidth: 1,
      };
    };

    return (
      <svg viewBox="0 0 200 400" className="w-full h-auto max-h-[280px]">
        <title>{view === 'front' ? 'Front' : 'Back'} view body diagram</title>
        
        {/* Gradient definitions for 3D effect */}
        <defs>
          <linearGradient id={`bodyGradient-${view}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#f8fafc" />
            <stop offset="100%" stopColor="#e2e8f0" />
          </linearGradient>
          <linearGradient id={`injuryGradient-${view}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fecaca" />
            <stop offset="50%" stopColor="#fca5a5" />
            <stop offset="100%" stopColor="#fecaca" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.1"/>
          </filter>
        </defs>

        <g filter="url(#shadow)">
          {/* Head */}
          <ellipse 
            cx="100" cy="35" rx="22" ry="26"
            {...getRegionStyle('head')}
          />
          
          {/* Neck */}
          <rect 
            x="90" y="58" width="20" height="16" rx="4"
            {...getRegionStyle('neck')}
          />
          
          {/* Shoulders */}
          <ellipse 
            cx="58" cy="85" rx="14" ry="12"
            {...getRegionStyle('shoulder-left')}
          />
          <ellipse 
            cx="142" cy="85" rx="14" ry="12"
            {...getRegionStyle('shoulder-right')}
          />
          
          {/* Torso */}
          <path 
            d={view === 'front' 
              ? "M70 75 Q100 70 130 75 L135 140 Q100 145 65 140 Z"
              : "M70 75 Q100 70 130 75 L135 140 Q100 145 65 140 Z"
            }
            {...getRegionStyle(view === 'front' ? 'chest' : 'upperback')}
          />
          
          {/* Abdomen / Lower Back */}
          <path 
            d="M68 138 Q100 143 132 138 L128 195 Q100 200 72 195 Z"
            {...getRegionStyle(view === 'front' ? 'abdomen' : 'lowerback')}
          />
          
          {/* Pelvis / Glutes */}
          <path 
            d="M72 193 Q100 198 128 193 L125 225 Q100 235 75 225 Z"
            {...getRegionStyle(view === 'front' ? 'pelvis' : 'glutes')}
          />
          
          {/* Upper Arms */}
          <rect 
            x="44" y="92" width="16" height="50" rx="8"
            {...getRegionStyle('upperarm-left')}
          />
          <rect 
            x="140" y="92" width="16" height="50" rx="8"
            {...getRegionStyle('upperarm-right')}
          />
          
          {/* Forearms & Hands */}
          <path 
            d="M44 140 Q52 145 52 180 L52 210 Q52 218 48 218 L44 218 Q40 218 40 210 L40 145 Q40 140 44 140"
            {...getRegionStyle('forearmhand-left')}
          />
          <path 
            d="M156 140 Q148 145 148 180 L148 210 Q148 218 152 218 L156 218 Q160 218 160 210 L160 145 Q160 140 156 140"
            {...getRegionStyle('forearmhand-right')}
          />
          
          {/* Thighs */}
          <path 
            d="M78 223 Q88 225 93 223 L95 295 Q88 300 78 295 Z"
            {...getRegionStyle('thigh-left')}
          />
          <path 
            d="M107 223 Q117 225 122 223 L122 295 Q115 300 105 295 Z"
            {...getRegionStyle('thigh-right')}
          />
          
          {/* Knees */}
          <ellipse 
            cx="86" cy="305" rx="10" ry="12"
            {...getRegionStyle('knee-left')}
          />
          <ellipse 
            cx="114" cy="305" rx="10" ry="12"
            {...getRegionStyle('knee-right')}
          />
          
          {/* Lower Legs */}
          <path 
            d={view === 'front'
              ? "M78 315 Q86 318 94 315 L92 365 Q86 370 80 365 Z"
              : "M78 315 Q86 318 94 315 L92 365 Q86 370 80 365 Z"
            }
            {...getRegionStyle(view === 'front' ? 'shin-left' : 'calf-left')}
          />
          <path 
            d={view === 'front'
              ? "M106 315 Q114 318 122 315 L120 365 Q114 370 108 365 Z"
              : "M106 315 Q114 318 122 315 L120 365 Q114 370 108 365 Z"
            }
            {...getRegionStyle(view === 'front' ? 'shin-right' : 'calf-right')}
          />
          
          {/* Feet */}
          <ellipse 
            cx="86" cy="378" rx="12" ry="16"
            {...getRegionStyle('foot-left')}
          />
          <ellipse 
            cx="114" cy="378" rx="12" ry="16"
            {...getRegionStyle('foot-right')}
          />
        </g>
        
        {/* Injury pulse animation overlay */}
        {selectedRegions.filter(r => r.startsWith(view)).length > 0 && (
          <g className="animate-pulse" opacity="0.3">
            {selectedRegions.filter(r => r.startsWith(view)).map(region => {
              const regionId = region.replace(`${view}-`, '');
              // Add subtle glow effect on injured areas
              return null; // The styling is already applied above
            })}
          </g>
        )}
      </svg>
    );
  };

  const hasInjury = selectedRegions.length > 0;
  const frontInjuries = selectedRegions.filter(r => r.startsWith('front-'));
  const backInjuries = selectedRegions.filter(r => r.startsWith('back-'));

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4 text-red-600" />
          Injury Location
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          {/* Front View */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Front</p>
            <div className={`rounded-lg p-2 ${frontInjuries.length > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
              <BodyDiagram view="front" />
            </div>
          </div>
          
          {/* Back View */}
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground mb-1">Back</p>
            <div className={`rounded-lg p-2 ${backInjuries.length > 0 ? 'bg-red-50' : 'bg-slate-50'}`}>
              <BodyDiagram view="back" />
            </div>
          </div>
        </div>
        
        {/* Injury Summary */}
        {hasInjury && (
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap gap-1">
              {selectedRegions.map(region => (
                <Badge 
                  key={region} 
                  variant="destructive" 
                  className="text-xs bg-red-100 text-red-700 hover:bg-red-100"
                >
                  {getRegionLabel(region)}
                </Badge>
              ))}
            </div>
            
            {injuryType && (
              <p className="text-xs">
                <span className="text-muted-foreground">Type: </span>
                <span className="font-medium">{injuryType}</span>
              </p>
            )}
          </div>
        )}
        
        {!hasInjury && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            No specific injury location recorded
          </div>
        )}
      </CardContent>
    </Card>
  );
}
