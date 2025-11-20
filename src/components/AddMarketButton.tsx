import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";

const AddMarketButton = () => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any>(null);

  const handlePreview = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-kalshi-market', {
        body: { url }
      });
      
      if (error) throw error;
      setPreview(data);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to fetch market details. Check the URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!preview) return;
    setLoading(true);
    try {
      // 1. Insert Market
      const { data: marketData, error: marketError } = await supabase
        .from('markets')
        .upsert({
          kalshi_id: preview.series_ticker,
          ticker: preview.series_ticker,
          title: preview.title,
          category: preview.category,
          description: preview.title,
          status: 'active',
          icon: '📊' // We could map category to icon here too
        }, { onConflict: 'kalshi_id' })
        .select()
        .single();

      if (marketError) throw marketError;

      // 2. Insert Options
      const isMulti = preview.markets.length > 1;
      
      for (const m of preview.markets) {
        if (isMulti) {
          const title = m.subtitle || m.ticker;
          await supabase.from('market_options').upsert({
             market_id: marketData.id,
             title: title,
             current_probability: m.yes_price,
             kalshi_id: m.ticker
          }, { onConflict: 'kalshi_id' });
        } else {
          // Binary
          await supabase.from('market_options').upsert({
             market_id: marketData.id,
             title: 'Yes',
             current_probability: m.yes_price,
             kalshi_id: `${m.ticker}-Yes`
          }, { onConflict: 'kalshi_id' });
           await supabase.from('market_options').upsert({
             market_id: marketData.id,
             title: 'No',
             current_probability: m.no_price,
             kalshi_id: `${m.ticker}-No`
          }, { onConflict: 'kalshi_id' });
        }
      }

      toast.success('Market added successfully!');
      setOpen(false);
      setPreview(null);
      setUrl("");
      // Reload to show new market
      window.location.reload();
      
    } catch (error) {
      console.error('Add error:', error);
      // @ts-ignore
      const message = error?.message || 'Failed to add market';
      toast.error(`Failed to add market: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Market
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Kalshi Market</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://kalshi.com/markets/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <Button onClick={handlePreview} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Preview'}
            </Button>
          </div>

          {preview && (
            <Card className="p-4 bg-muted/50">
              <h3 className="font-semibold mb-1">{preview.title}</h3>
              <div className="text-sm text-muted-foreground mb-2">{preview.category}</div>
              <div className="space-y-1">
                 {preview.markets.slice(0, 3).map((m: any, i: number) => (
                   <div key={i} className="flex justify-between text-sm">
                     <span>{preview.markets.length > 1 ? (m.subtitle || m.ticker) : 'Yes'}</span>
                     <span className="font-mono">{m.yes_price}¢</span>
                   </div>
                 ))}
                 {preview.markets.length > 3 && <div className="text-xs text-center">...</div>}
              </div>
              <Button className="w-full mt-4" onClick={handleAdd} disabled={loading}>
                Confirm & Add
              </Button>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddMarketButton;

