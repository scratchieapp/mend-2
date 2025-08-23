import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Info, RotateCcw } from 'lucide-react';

interface BodyInjuryDiagramProps {
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  disabled?: boolean;
}

interface UIRegion {
  svg_id: string;
  view: 'front' | 'back';
  body_part_id: number | null;
  body_side_id: number | null;
  body_part?: { body_part_name: string };
  body_side?: { body_side_name: string };
}

export function BodyInjuryDiagram({ 
  selectedRegions, 
  onRegionsChange,
  disabled = false 
}: BodyInjuryDiagramProps) {
  const [activeView, setActiveView] = useState<'front' | 'back'>('front');
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);

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

  const handleRegionClick = (regionId: string) => {
    if (disabled) return;
    
    if (selectedRegions.includes(regionId)) {
      onRegionsChange(selectedRegions.filter(id => id !== regionId));
    } else {
      onRegionsChange([...selectedRegions, regionId]);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onRegionsChange([]);
  };

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

  const renderSVGRegion = (
    id: string,
    shape: 'circle' | 'rect',
    props: any,
    title: string
  ) => {
    const isSelected = selectedRegions.includes(id);
    const isHovered = hoveredRegion === id;
    const Component = shape === 'circle' ? 'circle' : 'rect';
    
    return (
      <Component
        key={id}
        id={id}
        className={`
          cursor-pointer transition-all duration-150 outline-none
          ${isSelected ? 'fill-blue-400 stroke-blue-600' : 'fill-gray-200 stroke-gray-400'}
          ${isHovered && !isSelected ? 'fill-blue-100' : ''}
          ${disabled ? 'cursor-not-allowed opacity-50' : 'hover:fill-blue-100'}
        `}
        strokeWidth={isSelected ? 3 : 2}
        onClick={() => handleRegionClick(id)}
        onMouseEnter={() => setHoveredRegion(id)}
        onMouseLeave={() => setHoveredRegion(null)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-pressed={isSelected}
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRegionClick(id);
          }
        }}
        {...props}
      >
        <title>{title}</title>
      </Component>
    );
  };

  const FrontView = () => (
    <svg viewBox="0 0 320 720" className="w-full h-auto">
      <title>Front view body map with clickable regions</title>
      
      {/* Head & Neck */}
      {renderSVGRegion('front-head', 'circle', { cx: 160, cy: 60, r: 38 }, 'Head (front)')}
      {renderSVGRegion('front-neck', 'rect', { x: 142, y: 98, width: 36, height: 22, rx: 6 }, 'Neck (front)')}
      
      {/* Torso */}
      {renderSVGRegion('front-chest', 'rect', { x: 105, y: 122, width: 110, height: 96, rx: 28 }, 'Chest')}
      {renderSVGRegion('front-abdomen', 'rect', { x: 118, y: 220, width: 84, height: 78, rx: 18 }, 'Abdomen')}
      {renderSVGRegion('front-pelvis', 'rect', { x: 118, y: 302, width: 84, height: 52, rx: 22 }, 'Pelvis / Groin')}
      
      {/* Left Arm */}
      {renderSVGRegion('front-shoulder-left', 'circle', { cx: 100, cy: 155, r: 18 }, 'Left Shoulder')}
      {renderSVGRegion('front-upperarm-left', 'rect', { x: 86, y: 172, width: 24, height: 72, rx: 12 }, 'Left Upper Arm')}
      {renderSVGRegion('front-forearmhand-left', 'rect', { x: 84, y: 246, width: 28, height: 112, rx: 12 }, 'Left Forearm & Hand')}
      
      {/* Right Arm */}
      {renderSVGRegion('front-shoulder-right', 'circle', { cx: 220, cy: 155, r: 18 }, 'Right Shoulder')}
      {renderSVGRegion('front-upperarm-right', 'rect', { x: 210, y: 172, width: 24, height: 72, rx: 12 }, 'Right Upper Arm')}
      {renderSVGRegion('front-forearmhand-right', 'rect', { x: 208, y: 246, width: 28, height: 112, rx: 12 }, 'Right Forearm & Hand')}
      
      {/* Left Leg */}
      {renderSVGRegion('front-thigh-left', 'rect', { x: 130, y: 356, width: 34, height: 116, rx: 14 }, 'Left Thigh')}
      {renderSVGRegion('front-knee-left', 'circle', { cx: 147, cy: 474, r: 14 }, 'Left Knee')}
      {renderSVGRegion('front-shin-left', 'rect', { x: 134, y: 490, width: 26, height: 116, rx: 12 }, 'Left Shin')}
      {renderSVGRegion('front-foot-left', 'rect', { x: 130, y: 608, width: 34, height: 92, rx: 16 }, 'Left Foot')}
      
      {/* Right Leg */}
      {renderSVGRegion('front-thigh-right', 'rect', { x: 156, y: 356, width: 34, height: 116, rx: 14 }, 'Right Thigh')}
      {renderSVGRegion('front-knee-right', 'circle', { cx: 173, cy: 474, r: 14 }, 'Right Knee')}
      {renderSVGRegion('front-shin-right', 'rect', { x: 160, y: 490, width: 26, height: 116, rx: 12 }, 'Right Shin')}
      {renderSVGRegion('front-foot-right', 'rect', { x: 156, y: 608, width: 34, height: 92, rx: 16 }, 'Right Foot')}
    </svg>
  );

  const BackView = () => (
    <svg viewBox="0 0 320 720" className="w-full h-auto">
      <title>Back view body map with clickable regions</title>
      
      {/* Head & Neck */}
      {renderSVGRegion('back-head', 'circle', { cx: 160, cy: 60, r: 38 }, 'Head (back)')}
      {renderSVGRegion('back-neck', 'rect', { x: 142, y: 98, width: 36, height: 22, rx: 6 }, 'Neck (back)')}
      
      {/* Back */}
      {renderSVGRegion('back-upperback', 'rect', { x: 105, y: 122, width: 110, height: 96, rx: 28 }, 'Upper Back')}
      {renderSVGRegion('back-lowerback', 'rect', { x: 118, y: 220, width: 84, height: 78, rx: 18 }, 'Lower Back')}
      {renderSVGRegion('back-glutes', 'rect', { x: 118, y: 302, width: 84, height: 52, rx: 22 }, 'Glutes')}
      
      {/* Left Arm */}
      {renderSVGRegion('back-shoulder-left', 'circle', { cx: 100, cy: 155, r: 18 }, 'Left Shoulder (back)')}
      {renderSVGRegion('back-upperarm-left', 'rect', { x: 86, y: 172, width: 24, height: 72, rx: 12 }, 'Left Upper Arm (back)')}
      {renderSVGRegion('back-forearmhand-left', 'rect', { x: 84, y: 246, width: 28, height: 112, rx: 12 }, 'Left Forearm & Hand (back)')}
      
      {/* Right Arm */}
      {renderSVGRegion('back-shoulder-right', 'circle', { cx: 220, cy: 155, r: 18 }, 'Right Shoulder (back)')}
      {renderSVGRegion('back-upperarm-right', 'rect', { x: 210, y: 172, width: 24, height: 72, rx: 12 }, 'Right Upper Arm (back)')}
      {renderSVGRegion('back-forearmhand-right', 'rect', { x: 208, y: 246, width: 28, height: 112, rx: 12 }, 'Right Forearm & Hand (back)')}
      
      {/* Left Leg */}
      {renderSVGRegion('back-thigh-left', 'rect', { x: 130, y: 356, width: 34, height: 116, rx: 14 }, 'Left Thigh (back)')}
      {renderSVGRegion('back-calf-left', 'rect', { x: 134, y: 474, width: 26, height: 132, rx: 12 }, 'Left Calf')}
      {renderSVGRegion('back-foot-left', 'rect', { x: 130, y: 608, width: 34, height: 92, rx: 16 }, 'Left Foot (back)')}
      
      {/* Right Leg */}
      {renderSVGRegion('back-thigh-right', 'rect', { x: 156, y: 356, width: 34, height: 116, rx: 14 }, 'Right Thigh (back)')}
      {renderSVGRegion('back-calf-right', 'rect', { x: 160, y: 474, width: 26, height: 132, rx: 12 }, 'Right Calf')}
      {renderSVGRegion('back-foot-right', 'rect', { x: 156, y: 608, width: 34, height: 92, rx: 16 }, 'Right Foot (back)')}
    </svg>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Body Injury Location</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled || selectedRegions.length === 0}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
          <Info className="h-4 w-4 text-blue-600" />
          <p className="text-sm text-blue-800">
            Click on body parts to select injury locations. You can select multiple areas.
          </p>
        </div>

        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'front' | 'back')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="front">Front View</TabsTrigger>
            <TabsTrigger value="back">Back View</TabsTrigger>
          </TabsList>
          
          <TabsContent value="front" className="mt-4">
            <FrontView />
          </TabsContent>
          
          <TabsContent value="back" className="mt-4">
            <BackView />
          </TabsContent>
        </Tabs>

        {selectedRegions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Selected Areas:</p>
            <div className="flex flex-wrap gap-2">
              {selectedRegions.map(region => (
                <Badge
                  key={region}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleRegionClick(region)}
                >
                  {getRegionLabel(region)}
                  <span className="ml-1 text-xs">✕</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {hoveredRegion && (
          <div className="text-sm text-muted-foreground">
            Hovering: {getRegionLabel(hoveredRegion)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}