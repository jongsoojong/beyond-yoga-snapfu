import 'core-js/features/promise';
import { polyfills } from '@searchspring/snap-preact';

const promises = [];
if (!('fetch' in window)) {
	// @ts-ignore - types not important
	promises.push(import('whatwg-fetch'));
}
if (!('Symbol' in window) || !('flatMap' in Array.prototype) || !('includes' in Array.prototype)) {
	// @ts-ignore - types not important
	promises.push(import('core-js/stable'));
}
promises.push(polyfills);
Promise.all(promises).then(() => {
	window.searchspring = window.searchspring || {};
	window.searchspring.build = 'universal';
	import('./index');
});
