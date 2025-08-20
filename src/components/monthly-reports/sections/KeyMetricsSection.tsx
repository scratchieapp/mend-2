import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface KeyMetricsProps {
  metrics: {
    firstAid: number;
    mti: number;
    lti: number;
    ltifr: number;
    trifr: number;
    mtifr: number;
  };
}

export const KeyMetricsSection = ({ metrics }: KeyMetricsProps) => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Key Safety Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.firstAid}</div>
              <div className="text-sm text-muted-foreground">First Aid Cases</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.mti}</div>
              <div className="text-sm text-muted-foreground">Medical Treatment Injuries</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.lti}</div>
              <div className="text-sm text-muted-foreground">Lost Time Injuries</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Month Frequency Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.ltifr}</div>
              <div className="text-sm text-muted-foreground">LTIFR</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.trifr}</div>
              <div className="text-sm text-muted-foreground">TRIFR</div>
            </div>
            <div className="p-4 bg-secondary rounded-lg text-center">
              <div className="text-2xl font-bold">{metrics.mtifr}</div>
              <div className="text-sm text-muted-foreground">MTIFR</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};