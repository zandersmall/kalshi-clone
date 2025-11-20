import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchBalance();
    }
  }, [user]);

  const fetchBalance = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from("profiles")
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();

    if (data && !error) {
      setBalance(parseFloat(data.balance.toString()));
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  return (
    <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-primary">
              PaperTrade
            </Link>
            <div className="hidden md:flex gap-6">
              <Link to="/" className="text-foreground hover:text-primary transition-colors">
                Markets
              </Link>
              {user && (
                <Link to="/portfolio" className="text-foreground hover:text-primary transition-colors">
                  Portfolio
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Balance:</span>
                  <span className="font-semibold text-primary">
                    ${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <Button onClick={handleSignOut} variant="outline" size="sm">
                  Sign Out
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => navigate("/auth")} variant="ghost" size="sm">
                  Log in
                </Button>
                <Button onClick={() => navigate("/auth")} size="sm" className="bg-primary hover:bg-primary/90">
                  Sign up
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
