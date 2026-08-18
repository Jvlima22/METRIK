import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { activityFeed, activityIcon, activityTone, relativeTime } from "@/lib/activity";
import { useAuth } from "@/lib/auth-context";
import { useAccount } from "@/lib/account-context";

/**
 * Slide-over feed of recent worker/compliance events. Opened from the bell
 * button in the AppShell header.
 */
export function ActivityFeedPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isAdmin } = useAuth();
  const { activeCompanyId } = useAccount();
  const visibleFeed = isAdmin && !activeCompanyId ? activityFeed : [];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 bg-white/95 backdrop-blur-xl">
        <SheetHeader className="p-5 pb-4 border-b border-border">
          <SheetTitle className="font-display text-lg flex items-center gap-2">
            Feed de atividade
          </SheetTitle>
          <SheetDescription className="text-xs">
            Eventos do worker, violações e takedowns em tempo real
          </SheetDescription>
        </SheetHeader>

        <div className="p-5 overflow-y-auto h-[calc(100dvh-5.5rem)]">
          <div className="relative">
            <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet/30 via-border to-transparent" />
            <div className="space-y-3">
              {visibleFeed.length === 0 && <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhuma atividade registrada para esta empresa.</div>}
              {visibleFeed.map((ev, i) => {
                const Icon = activityIcon[ev.kind];
                const tone = activityTone[ev.kind];
                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative flex gap-3"
                  >
                    <div
                      className={`relative shrink-0 size-8 rounded-lg ${tone.bg} ${tone.text} flex items-center justify-center ring-4 ring-white ${tone.glow}`}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="flex-1 min-w-0 -mt-0.5 pb-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold leading-tight">{ev.title}</p>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {relativeTime(ev.at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{ev.detail}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
