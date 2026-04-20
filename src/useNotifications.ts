import { useEffect, useRef } from 'react';

export function useNotifications(todayHabits: any[]) {
  // Track all scheduled timeout IDs so we can cancel them before rescheduling
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear every previously-scheduled notification before re-scheduling
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];

    if (!('Notification' in window)) return;

    const requestAndSchedule = async () => {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      todayHabits.forEach(({ habit }) => {
        if (!habit.startTime || habit.showInChecklist) return;

        const [hours, minutes] = habit.startTime.split(':').map(Number);
        const now = new Date();
        const notifyTime = new Date();
        notifyTime.setHours(hours, minutes, 0, 0);

        // Notify 5 minutes before start
        const msUntilNotify = notifyTime.getTime() - now.getTime() - 5 * 60 * 1000;
        if (msUntilNotify <= 0) return;

        const timeoutId = setTimeout(() => {
          new Notification('⏰ Evolv Reminder', {
            body: `"${habit.title}" starts in 5 minutes!`,
            icon: '/icon-512.png',
            badge: '/icon-512.png',
            tag: habit.id, // browser deduplicates same tag automatically
          });
        }, msUntilNotify);

        timeoutsRef.current.push(timeoutId);
      });
    };

    requestAndSchedule();

    // Cleanup: cancel all pending timeouts when habits change or component unmounts
    return () => {
      timeoutsRef.current.forEach(id => clearTimeout(id));
      timeoutsRef.current = [];
    };
  }, [todayHabits]);
}
