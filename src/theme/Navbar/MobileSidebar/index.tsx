import {useEffect} from 'react';
import OriginalMobileSidebar from '@theme-original/Navbar/MobileSidebar';
import {useNavbarMobileSidebar} from '@docusaurus/theme-common/internal';

/** Keep the theme's navigation, with keyboard dismissal and contained focus. */
export default function MobileSidebar() {
  const {shown, toggle} = useNavbarMobileSidebar();

  useEffect(() => {
    if (!shown) return;
    const trigger = document.querySelector<HTMLElement>('.navbar__toggle');
    const sidebar = document.querySelector<HTMLElement>('.navbar-sidebar');
    if (!sidebar) return;
    sidebar.querySelector<HTMLElement>('.navbar-sidebar__close')?.focus();

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        toggle();
      } else if (event.key === 'Tab') {
        const bounds = sidebar!.getBoundingClientRect();
        const items = [...sidebar!.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), [tabindex="0"]')].filter((item) => {
          const rect = item.getBoundingClientRect();
          return rect.width > 0 && rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && getComputedStyle(item).visibility !== 'hidden';
        });
        const first = items[0];
        const last = items[items.length - 1];
        if (first && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      trigger?.focus({preventScroll: true});
    };
  }, [shown, toggle]);

  return <OriginalMobileSidebar />;
}
