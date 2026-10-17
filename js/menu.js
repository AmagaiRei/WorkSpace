const menu = document.querySelector('.mobile-menu');

if (menu) {
   const close = () => {
      menu.open = false;
   };

   menu.addEventListener('click', (event) => {
      if (event.target.closest('a')) close();
   });

   document.addEventListener('click', (event) => {
      if (menu.open && !menu.contains(event.target)) close();
   });

   document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.open) {
         close();
         menu.querySelector('summary').focus();
      }
   });

   window
      .matchMedia('(min-width: 761px)')
      .addEventListener('change', (event) => {
         if (event.matches) close();
      });
}
