import type { App, DirectiveBinding } from 'vue';

const DefaultEmpty = {
    mounted(el: Element, binding: DirectiveBinding) {
        updateElement(el, binding);
    },
    updated(el: Element, binding: DirectiveBinding) {
        updateElement(el, binding);
    },
};

function updateElement(el: Element, binding: DirectiveBinding) {
    el.innerHTML = binding.value ?? '--';
}

export default function (app: App) {
    app.directive('defempty', DefaultEmpty);
}
