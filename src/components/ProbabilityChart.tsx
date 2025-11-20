import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "./ui/card";

interface ProbabilityChartProps {
  marketId: string;
  options: Array<{ id: string; title: string; current_probability: number }>;
}

interface HistoryPoint {
  timestamp: string;
  [key: string]: number | string;
}

const ProbabilityChart = ({ marketId, options }: ProbabilityChartProps) => {
  const [chartData, setChartData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('probability-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'probability_history',
          filter: `market_id=eq.${marketId}`
        },
        (payload) => {
          console.log('New probability data:', payload);
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [marketId]);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('probability_history')
        .select('option_id, probability, recorded_at')
        .eq('market_id', marketId)
        .order('recorded_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        // No history yet, use current values
        setChartData([{
          timestamp: new Date().toISOString(),
          ...options.reduce((acc, opt) => ({
            ...acc,
            [opt.title]: opt.current_probability
          }), {})
        }]);
        setLoading(false);
        return;
      }

      // Group by timestamp and aggregate probabilities
      const groupedData = new Map<string, Record<string, number>>();
      
      data.forEach(record => {
        const timestamp = new Date(record.recorded_at).toISOString();
        if (!groupedData.has(timestamp)) {
          groupedData.set(timestamp, {});
        }
        
        const option = options.find(opt => opt.id === record.option_id);
        if (option) {
          groupedData.get(timestamp)![option.title] = record.probability;
        }
      });

      const formattedData: HistoryPoint[] = Array.from(groupedData.entries()).map(([timestamp, probs]) => ({
        timestamp: new Date(timestamp).toLocaleTimeString(),
        ...probs
      }));

      setChartData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching probability history:', error);
      setLoading(false);
    }
  };

  const colors = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  if (loading) {
    return (
      <Card className="p-6">
        <h2 className="font-semibold mb-4">Probability Over Time</h2>
        <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
          <p className="text-muted-foreground">Loading chart...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-semibold mb-4">Probability Over Time</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="timestamp" 
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            domain={[0, 100]}
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            label={{ value: 'Probability (%)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px'
            }}
          />
          <Legend />
          {options.map((option, index) => (
            <Line
              key={option.id}
              type="monotone"
              dataKey={option.title}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ProbabilityChart;
