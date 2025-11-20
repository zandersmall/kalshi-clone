import { useState } from "react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";

const SyncMarketsButton = () => {
  const [syncing, setSyncing] = useState(false);

  const syncMarkets = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-markets');
      
      if (error) throw error;
      
      toast.success(`Synced ${data.markets_synced} markets from Polymarket`);
      
      // Refresh the page to show new markets
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Failed to sync markets');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button 
      onClick={syncMarkets} 
      disabled={syncing}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
      {syncing ? 'Syncing...' : 'Sync Markets'}
    </Button>
  );
};

export default SyncMarketsButton;
