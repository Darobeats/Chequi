import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Target, Users, Settings } from 'lucide-react';

interface CoverageMetricsProps {
  coverageAnalysis: {
    controlCoverage: Array<{
      id: string;
      name: string;
      totalUsages: number;
      uniqueUsers: number;
      coverage: number;
      color?: string;
    }>;
    categoryCoverage: Array<{
      id: string;
      name: string;
      totalAttendees: number;
      usedAttendees: number;
      coverage: number;
      color?: string;
    }>;
  };
}

const CoverageMetrics: React.FC<CoverageMetricsProps> = ({ coverageAnalysis }) => {
  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return 'text-green-400';
    if (coverage >= 60) return 'text-yellow-400';
    if (coverage >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getCoverageStatus = (coverage: number) => {
    if (coverage >= 80) return { text: 'Excelente', variant: 'default' as const };
    if (coverage >= 60) return { text: 'Bueno', variant: 'secondary' as const };
    if (coverage >= 40) return { text: 'Regular', variant: 'outline' as const };
    return { text: 'Bajo', variant: 'destructive' as const };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Control Coverage */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Cobertura por Tipo de Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverageAnalysis.controlCoverage.map((control) => {
            const status = getCoverageStatus(control.coverage);
            return (
              <div key={control.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: control.color || '#64748B' }}
                    />
                    <span className="font-medium text-foreground capitalize">
                      {control.name}
                    </span>
                    <Badge variant={status.variant} className="text-xs">
                      {status.text}
                    </Badge>
                  </div>
                  <span className={`font-bold ${getCoverageColor(control.coverage)}`}>
                    {control.coverage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={control.coverage} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{control.uniqueUsers} usuarios únicos</span>
                  <span>{control.totalUsages} usos totales</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Category Coverage */}
      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Participación por Categoría
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {coverageAnalysis.categoryCoverage.map((category) => {
            const status = getCoverageStatus(category.coverage);
            return (
              <div key={category.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color || '#64748B' }}
                    />
                    <span className="font-medium text-foreground capitalize">
                      {category.name}
                    </span>
                    <Badge variant={status.variant} className="text-xs">
                      {status.text}
                    </Badge>
                  </div>
                  <span className={`font-bold ${getCoverageColor(category.coverage)}`}>
                    {category.coverage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={category.coverage} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{category.usedAttendees} activos</span>
                  <span>de {category.totalAttendees} totales</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
};

export default CoverageMetrics;