export default [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home.vue'),
  },
  {
    path: '/quill',
    name: 'quill',
    props: true,
    component: () => import('@/views/Quill/index.vue'),
  },
];
