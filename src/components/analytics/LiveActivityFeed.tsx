import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  Clock, 
  User, 
  Settings,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface LiveActivityFeedProps {
  recentActivity: Array<{
    id: string;
    used_at: string;
    timeAgo: string;
    attendeeName: string;
    controlName: string;
    categoryName: string;
    device?: string;
    notes?: string;
    control_type?: { color?: string };
    attendee?: { ticket_category?: { color?: string } };
  }>;
}

const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ recentActivity }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getRelativeTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Hace un momento';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    return format(date, 'dd/MM HH:mm', { locale: es });
  };

  return (
    <Card className="bg-card/50 border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Actividad en Tiempo Real
            <Badge variant="outline" className="text-xs">
              {recentActivity.length} registros
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-xs"
            >
              {isPaused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {isPaused ? 'Reanudar' : 'Pausar'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((activity, index) => (
                <div 
                  key={activity.id}
                  className={`p-3 rounded-lg border border-border bg-background/50 transition-all duration-300 ${
                    index === 0 && !isPaused ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="font-medium text-foreground truncate">
                          {activity.attendeeName}
                        </span>
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                          style={{ 
                            backgroundColor: activity.attendee?.ticket_category?.color + '20',
                            borderColor: activity.attendee?.ticket_category?.color
                          }}
                        >
                          {activity.categoryName}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground capitalize">
                          {activity.controlName}
                        </span>
                        {activity.control_type?.color && (
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: activity.control_type.color }}
                          />
                        )}
                      </div>

                      {activity.device && (
                        <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <span>📱 {activity.device}</span>
                        </div>
                      )}

                      {activity.notes && (
                        <div className="text-xs text-muted-foreground italic">
                          "{activity.notes}"
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{getRelativeTime(activity.used_at)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(parseISO(activity.used_at), 'HH:mm:ss')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;