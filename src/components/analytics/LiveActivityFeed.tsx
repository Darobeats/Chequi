import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface LiveActivityFeedProps {
  recentActivity: Array<{
    id: string;
    used_at: string;
    attendeeName: string;
    controlName: string;
    categoryName: string;
    control_type?: { color?: string };
    attendee?: { ticket_category?: { color?: string } };
  }>;
  limit?: number;
}

const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({ recentActivity, limit = 8 }) => {
  const items = recentActivity.slice(0, limit);

  return (
    <Card className="bg-card/50 border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm sm:text-base text-foreground flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <span>Actividad en vivo</span>
          <span className="ml-auto text-xs text-muted-foreground font-normal">últimos {items.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 pt-0">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Sin actividad reciente</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a, i) => {
              const catColor = a.attendee?.ticket_category?.color || 'hsl(var(--muted-foreground))';
              return (
                <li key={a.id} className={`py-2 flex items-center gap-2 text-sm ${i === 0 ? 'animate-in fade-in' : ''}`}>
                  <span
                    className="inline-block w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: catColor }}
                    title={a.categoryName}
                  />
                  <span className="tabular-nums text-xs text-muted-foreground w-12 shrink-0">
                    {format(parseISO(a.used_at), 'HH:mm')}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-foreground">{a.attendeeName}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[35%] capitalize">{a.controlName}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default LiveActivityFeed;
