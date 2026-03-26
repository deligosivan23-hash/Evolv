import { useEffect } from 'react';

export function useNotifications(todayHabits: any[]) {
  useEffect(() => {
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

        setTimeout(() => {
          new Notification('⏰ Evolv Reminder', {
            body: `"${habit.title}" starts in 5 minutes!`,
            icon: '/icon-512.png',
            badge: '/icon-512.png',
            tag: habit.id,
          });
        }, msUntilNotify);
      });
    };

    requestAndSchedule();
  }, [todayHabits]);
}
