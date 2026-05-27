import App from './App.vue';
import { createApp } from 'vue';
import pinia from './store/Index';
import i18n from './setup/i18n-setup';
import router from './setup/router-setup';
import dateFormat from '@/filters/dateFormat';
import DefaultEmpty from '@/directives/whenEmpty';
import onlyNumber from '@/directives/onlyNumber';
import dataThousands from '@/filters/dataThousands';
import numberOperation from '@/filters/numberOperation';

import 'nprogress/nprogress.css';
import '@arco-design/web-vue/es/message/style/css.js';
import '@/assets/stylesheet/main.css';

createApp(App)
    .use(pinia)
    .use(i18n)
    .use(router)
    .use(dateFormat)
    .use(DefaultEmpty)
    .use(onlyNumber)
    .use(dataThousands)
    .use(numberOperation)
    .mount('#app');
