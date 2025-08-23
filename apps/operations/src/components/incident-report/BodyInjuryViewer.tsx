import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Activity } from 'lucide-react';

interface BodyInjuryViewerProps {
  selectedRegions: string[];
  injuryType?: string;
  injuryDescription?: string;
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

  const renderInjuryMarker = (regionId: string, view: 'front' | 'back') => {
    if (!selectedRegions.includes(`${view}-${regionId}`)) return null;
    
    // Define anatomically correct positions for injury markers
    const positions: { [key: string]: { x: number; y: number; width: number; height: number } } = {
      // Front view positions
      'front-head': { x: 141, y: 22, width: 38, height: 38 },
      'front-neck': { x: 142, y: 98, width: 36, height: 22 },
      'front-chest': { x: 105, y: 122, width: 110, height: 96 },
      'front-abdomen': { x: 118, y: 220, width: 84, height: 78 },
      'front-pelvis': { x: 118, y: 302, width: 84, height: 52 },
      'front-shoulder-left': { x: 82, y: 137, width: 36, height: 36 },
      'front-shoulder-right': { x: 202, y: 137, width: 36, height: 36 },
      'front-upperarm-left': { x: 86, y: 172, width: 24, height: 72 },
      'front-upperarm-right': { x: 210, y: 172, width: 24, height: 72 },
      'front-forearmhand-left': { x: 84, y: 246, width: 28, height: 112 },
      'front-forearmhand-right': { x: 208, y: 246, width: 28, height: 112 },
      'front-thigh-left': { x: 130, y: 356, width: 34, height: 116 },
      'front-thigh-right': { x: 156, y: 356, width: 34, height: 116 },
      'front-knee-left': { x: 133, y: 460, width: 28, height: 28 },
      'front-knee-right': { x: 159, y: 460, width: 28, height: 28 },
      'front-shin-left': { x: 134, y: 490, width: 26, height: 116 },
      'front-shin-right': { x: 160, y: 490, width: 26, height: 116 },
      'front-foot-left': { x: 130, y: 608, width: 34, height: 92 },
      'front-foot-right': { x: 156, y: 608, width: 34, height: 92 },
      
      // Back view positions
      'back-head': { x: 141, y: 22, width: 38, height: 38 },
      'back-neck': { x: 142, y: 98, width: 36, height: 22 },
      'back-upperback': { x: 105, y: 122, width: 110, height: 96 },
      'back-lowerback': { x: 118, y: 220, width: 84, height: 78 },
      'back-glutes': { x: 118, y: 302, width: 84, height: 52 },
      'back-shoulder-left': { x: 82, y: 137, width: 36, height: 36 },
      'back-shoulder-right': { x: 202, y: 137, width: 36, height: 36 },
      'back-upperarm-left': { x: 86, y: 172, width: 24, height: 72 },
      'back-upperarm-right': { x: 210, y: 172, width: 24, height: 72 },
      'back-forearmhand-left': { x: 84, y: 246, width: 28, height: 112 },
      'back-forearmhand-right': { x: 208, y: 246, width: 28, height: 112 },
      'back-thigh-left': { x: 130, y: 356, width: 34, height: 116 },
      'back-thigh-right': { x: 156, y: 356, width: 34, height: 116 },
      'back-calf-left': { x: 134, y: 474, width: 26, height: 132 },
      'back-calf-right': { x: 160, y: 474, width: 26, height: 132 },
      'back-foot-left': { x: 130, y: 608, width: 34, height: 92 },
      'back-foot-right': { x: 156, y: 608, width: 34, height: 92 },
    };
    
    const pos = positions[`${view}-${regionId}`];
    if (!pos) return null;
    
    return (
      <rect
        x={pos.x}
        y={pos.y}
        width={pos.width}
        height={pos.height}
        fill="rgba(239, 68, 68, 0.6)"
        stroke="rgb(220, 38, 38)"
        strokeWidth="2"
        rx="4"
        className="animate-pulse"
      />
    );
  };

  const FrontView = () => (
    <svg viewBox="0 0 320 720" className="w-full h-auto">
      <title>Front view body diagram</title>
      
      {/* Body outline */}
      <g className="fill-gray-100 stroke-gray-400 stroke-2">
        {/* Head */}
        <circle cx="160" cy="60" r="38" />
        {/* Neck */}
        <rect x="142" y="98" width="36" height="22" rx="6" />
        {/* Torso */}
        <rect x="105" y="122" width="110" height="96" rx="28" />
        <rect x="118" y="220" width="84" height="78" rx="18" />
        <rect x="118" y="302" width="84" height="52" rx="22" />
        {/* Left Arm */}
        <circle cx="100" cy="155" r="18" />
        <rect x="86" y="172" width="24" height="72" rx="12" />
        <rect x="84" y="246" width="28" height="112" rx="12" />
        {/* Right Arm */}
        <circle cx="220" cy="155" r="18" />
        <rect x="210" y="172" width="24" height="72" rx="12" />
        <rect x="208" y="246" width="28" height="112" rx="12" />
        {/* Left Leg */}
        <rect x="130" y="356" width="34" height="116" rx="14" />
        <circle cx="147" cy="474" r="14" />
        <rect x="134" y="490" width="26" height="116" rx="12" />
        <rect x="130" y="608" width="34" height="92" rx="16" />
        {/* Right Leg */}
        <rect x="156" y="356" width="34" height="116" rx="14" />
        <circle cx="173" cy="474" r="14" />
        <rect x="160" y="490" width="26" height="116" rx="12" />
        <rect x="156" y="608" width="34" height="92" rx="16" />
      </g>
      
      {/* Injury markers */}
      {selectedRegions.map(region => {
        if (region.startsWith('front-')) {
          const regionId = region.replace('front-', '');
          return renderInjuryMarker(regionId, 'front');
        }
        return null;
      })}
    </svg>
  );

  const BackView = () => (
    <svg viewBox="0 0 320 720" className="w-full h-auto">
      <title>Back view body diagram</title>
      
      {/* Body outline */}
      <g className="fill-gray-100 stroke-gray-400 stroke-2">
        {/* Head */}
        <circle cx="160" cy="60" r="38" />
        {/* Neck */}
        <rect x="142" y="98" width="36" height="22" rx="6" />
        {/* Back */}
        <rect x="105" y="122" width="110" height="96" rx="28" />
        <rect x="118" y="220" width="84" height="78" rx="18" />
        <rect x="118" y="302" width="84" height="52" rx="22" />
        {/* Left Arm */}
        <circle cx="100" cy="155" r="18" />
        <rect x="86" y="172" width="24" height="72" rx="12" />
        <rect x="84" y="246" width="28" height="112" rx="12" />
        {/* Right Arm */}
        <circle cx="220" cy="155" r="18" />
        <rect x="210" y="172" width="24" height="72" rx="12" />
        <rect x="208" y="246" width="28" height="112" rx="12" />
        {/* Left Leg */}
        <rect x="130" y="356" width="34" height="116" rx="14" />
        <rect x="134" y="474" width="26" height="132" rx="12" />
        <rect x="130" y="608" width="34" height="92" rx="16" />
        {/* Right Leg */}
        <rect x="156" y="356" width="34" height="116" rx="14" />
        <rect x="160" y="474" width="26" height="132" rx="12" />
        <rect x="156" y="608" width="34" height="92" rx="16" />
      </g>
      
      {/* Injury markers */}
      {selectedRegions.map(region => {
        if (region.startsWith('back-')) {
          const regionId = region.replace('back-', '');
          return renderInjuryMarker(regionId, 'back');
        }
        return null;
      })}
    </svg>
  );

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-red-600" />
          Injury Location Diagram
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Front View */}
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Front View</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <FrontView />
            </div>
          </div>
          
          {/* Back View */}
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground mb-2">Back View</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <BackView />
            </div>
          </div>
        </div>
        
        {/* Injury Information */}
        {(injuryType || injuryDescription || selectedRegions.length > 0) && (
          <div className="mt-6 space-y-3">
            {selectedRegions.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Affected Areas:</p>
                <p className="text-sm mt-1">
                  {selectedRegions.map(region => getRegionLabel(region)).join(', ')}
                </p>
              </div>
            )}
            
            {injuryType && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Injury Type:</span>
                <span className="text-sm font-semibold">{injuryType}</span>
              </div>
            )}
            
            {injuryDescription && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Description:</p>
                <p className="text-sm text-muted-foreground bg-gray-50 rounded p-3">
                  {injuryDescription}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}