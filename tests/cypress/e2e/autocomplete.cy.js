/**
 * End to end tests with Cypress!
 *
 * The purpose of these tests is to prevent publishing of the bundle if a
 * breaking change has been made to the implementation code in the future
 *
 * Start by fill out the config object below. If a selector is not provided,
 * the applicable tests will be skipped.
 *
 */

const config = {
	url: 'https://localhost:3333/index.html', // page containing autocomplete (recommended: home/about/contact page)
	disableGA: '', // disable google analytic events (example: 'UA-123456-1')
	selectors: {
		website: {
			openInputButton: '', // selector for a button to click in order to make the input visible
			input: '#search-input', // selector of <input> elements (config.controllers[].autocomplete[].config.selector)
		},
		autocomplete: {
			// selector of the wrapping element. Expects child element to contain <a>
			term: `.ss__autocomplete .ss__autocomplete__terms__option`,
			facet: '.ss__autocomplete .ss__facet .ss__facet__options',
			result: '.ss__autocomplete .ss__results .ss__result',
			seeMore: '.ss__autocomplete .ss__autocomplete__content__info',
		},
	},
	startingQuery: 't', // initial query (displays terms, facets, and results)
};

describe('Autocomplete', () => {
	describe('Setup', () => {
		it('has valid config', function () {
			cy.wrap(config).its('url').should('have.length.at.least', 1);
			cy.wrap(config).its('startingQuery').should('have.length.at.least', 1);
			cy.wrap(config).its('selectors.website.input').should('have.length.at.least', 1);
		});

		it('adds snap bundle to autocomplete page', function () {
			cy.visit(config.url);
			cy.addLocalSnap();

			cy.waitForBundle().then(() => {
				cy.window().then((window) => {
					expect(window.searchspring).to.exist;
				});
			});

			if (config.disableGA) {
				window[`ga-disable-${config.disableGA}`] = true;
			}
		});

		it('has a controller with an empty store', function () {
			cy.snapController('autocomplete').then(({ store }) => {
				expect(store.results.length).to.equal(0);
				expect(store.terms.length).to.equal(0);
				expect(store.state.input).to.equal(undefined);
			});
		});
	});

	describe('Tests Autocomplete', () => {
		before('open input', function () {
			if (config.selectors.website.openInputButton) {
				cy.get(config.selectors.website.openInputButton).first().click({ force: true });
			}
		});

		beforeEach('can make single letter query', function () {
			if (!config.startingQuery || !config?.selectors?.website?.input) this.skip();

			cy.get(config.selectors.website.input).first().should('exist').clear({ force: true });

			cy.get(config.selectors.website.input).first().should('exist').focus().type(config.startingQuery, { force: true });

			cy.wait('@autocomplete').should('exist');

			cy.snapController('autocomplete').then(({ store }) => {
				expect(store.state.input).to.equal(config.startingQuery);
				expect(store.terms.length).to.greaterThan(0);
			});
		});

		it('has trending results when focused', function () {
			cy.snapController('autocomplete').then(({ store }) => {
				if (store.config.settings.trending?.showResults && (store.config.settings.trending?.limit > 0)) {
					if (config.selectors.website.openInputButton) {
						cy.get(config.selectors.website.openInputButton).first().click({ force: true });
					}

					cy.get(config.selectors.website.input).first().should('exist').focus();

					cy.wait('@autocomplete').should('exist');
					cy.snapController('autocomplete').then(({ store }) => {
						expect(store.trending.length).to.greaterThan(0);
						expect(store.results.length).to.greaterThan(0);

						// close the search input
						if (config.selectors.website.openInputButton) {
							cy.get(config.selectors.website.openInputButton).first().click({ force: true });
						}
					});
				} else {
					this.skip();
				}
			});
		});

		it('has correct count and term in see more link', function () {
			if (!config?.selectors?.autocomplete?.seeMore) this.skip();

			cy.snapController('autocomplete').then(({ store }) => {
				const term = store.terms[0].value;

				cy.get(`${config.selectors.autocomplete.seeMore} a[href$="${store.services.urlManager.href}"]`)
					.should('exist')
					.contains(store.pagination.totalResults)
					.contains(term);
			});
		});

		it('can hover over term', function () {
			if (!config?.selectors?.autocomplete?.term) this.skip();

			cy.snapController('autocomplete').then(({ store }) => {
				if (store.terms.length <= 1) this.skip();
				cy.get('body').then((body) => {
					if (!body.find(`${config.selectors.autocomplete.term}`).length) {
						this.skip(); // skip if no terms in DOM
					}
				});

				cy.get(`${config.selectors.autocomplete.term}`).last().find('a').should('exist').rightclick({ force: true }); // trigger onFocus event

				cy.wait('@autocomplete').should('exist');

				cy.snapController('autocomplete').then(({ store }) => {
					const lastTerm = store.terms[store.terms.length - 1];
					expect(lastTerm.active).to.equal(true);
					expect(lastTerm.value).to.equal(store.search.query.string);
				});
			});
		});

		it('can hover over facet', function () {
			if (!config?.selectors?.input && !config?.selectors?.autocomplete?.facet) this.skip();

			cy.get(config.selectors.website.input).first().should('exist').clear({ force: true }).type(config.startingQuery, { force: true });
			cy.wait('@autocomplete').should('exist');

			cy.snapController('autocomplete').then(({ store }) => {
				if (store.facets.length == 0) this.skip(); //skip if this term has no facets
				cy.get('body').then((body) => {
					if (!body.find(`${config.selectors.autocomplete.facet} a`).length) {
						this.skip(); // skip if no facets in DOM
					}
				});

				cy.get(`${config.selectors.autocomplete.facet} a`).then((facetOptions) => {
					const firstOption = facetOptions[0];
					const optionURL = firstOption.href;

					cy.get(firstOption).rightclick({ force: true }); // trigger onFocus event

					cy.wait('@autocomplete').should('exist');

					cy.snapController('autocomplete').then(({ store }) => {
						cy.wrap(store.services.urlManager.state.filter).should('exist');
						cy.wrap(store.services.urlManager.href).should('contain', optionURL);
					});
				});
			});
		});

		it('has results', function () {
			if (!config?.selectors?.autocomplete?.result) this.skip();

			cy.snapController('autocomplete').then(({ store }) => {
				if (!store.results.length) this.skip(); //skip if this term has no results
				cy.get(`${config.selectors.autocomplete.result} a:first`)
					.should('have.length.greaterThan', 0)
					.each((result, index) => {
						if (store.results[index].type == 'product') {
							cy.get(result).should('have.attr', 'href', store.results[index].mappings.core.url);
						}
					});
			});
		});

		it('has see more link with correct URL', function () {
			if (!config?.selectors?.autocomplete?.seeMore) this.skip();

			cy.snapController('autocomplete').then(({ store }) => {
				cy.get(`${config.selectors.autocomplete.seeMore} a[href$="${store.services.urlManager.href}"]`).should('exist');
			});
		});

		it('can clear input', function () {
			if (!config?.selectors?.website?.input && !config?.startingQuery) this.skip();

			cy.get(config.selectors.website.input)
				.first()
				.should('exist')
				.should('have.value', config.startingQuery)
				.clear({ force: true })
				.should('have.value', '');
		});
	});
});
