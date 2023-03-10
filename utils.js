import { config } from './resources/config.js';
import { QueryEngine } from '@comunica/query-sparql';
import { CONSTRUCT_QUERY } from './resources/queries.js';
import hbs from 'hbs';

const sparql_endpoints = config.sparql_endpoints || ['https://dbpedia.org/sparql'];

let prefixMapping = {
    'http://w3id.org/': 'data',
    'http://w3id.org/vacceval/data/breakthrough_infections/': 'vacc',
    'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
    'http://purl.org/linked-data/cube#': 'qb',
    'http://www.w3.org/2001/XMLSchema#': 'xsd'
};

function getLabel(term) {
    if (term.termType == 'NamedNode') {
        return prefix(term.value);
    } else if (term.termType == 'BlankNode') {
        return term.id;
    } else {
        return term.value;
    }
};

function prefix(url) {
    const parts = url.split(/([#/])/);
    let fragment = '';
    for (let i = 1; i < parts.length - 1; i++) {
        fragment = parts[parts.length - i].concat(fragment);
        let prefix = url.substring(0, url.length - fragment.length);
        if (prefixMapping[prefix]) {
            return `${prefixMapping[prefix]}:${fragment}`;
        }
    }
    return url;
}

function getImage(value) {
    let imageFormats = ['jpeg', 'jpg', 'gif', 'png', 'apng', 'svg', 'bmp'];
    let ending = value.split('.').pop();
    if (imageFormats.includes(ending)) {
        return value;
    }
}

/* Handlebar helpers */
hbs.registerHelper('empty', (v) => {
    if(Array.isArray(v)){
        return v.length == 0;
    } else {
        return Object.keys(v).length == 0;
    }
});

hbs.registerHelper('not', (v) => !v);

hbs.registerHelper('and', (v1, v2, v3) => v1 && v2 && v3);

hbs.registerHelper('or', (v1, v2, v3) => v1 || v2 || v3);

hbs.registerHelper('get', (object, index) => object[index]);

hbs.registerHelper('format', (table, value) => {
    const term = table[value];
    if (!term) {
        return value;
    }
    const image = getImage(term.value);
    const label = getLabel(term);

    let html = '';
    if (image) {
        html += `<img src="${image}" class="small-img" alt="${term.value}">`;
    }
    if (term.termType == "NamedNode") {
        html += `<a href="./${encodeURIComponent(term.value)}">${label}</a>`;
        html += `<a href="${term.value}"><img class="external-link"></a>`;
    } else {
        html += label;
    }
    html += '';
    return html;
});

hbs.registerHelper('setVar', (varName, varValue, options) => {
    options.data.root[varName] = varValue;
});

hbs.registerHelper('get_delay', (t) => Date.now() - t);

hbs.registerHelper('sort', (value, options) => {
    const compareFn = (a, b) => {
        a = prefix(a).toUpperCase();
        b = prefix(b).toUpperCase();
        if (a < b) {
            return -1;
        }
        if (a > b) {
            return 1;
        }
        return 0;
    }

    if(Array.isArray(value)){
        return value.sort(compareFn);
    } else {
        return Object.keys(value).sort(compareFn);
    }
});

function pushIfNotExists(array, item) {
    if (!array.includes(item)) {
        array.push(item);
    }
}

async function visit(url, format = 'html') {
    // define query engine
    const engine = new QueryEngine();
    const sources = [];
    sparql_endpoints.forEach(value => sources.push({ type: 'sparql', value }));

    if (format == 'html') {
        const table = {};
        const subject = {};
        const property = [];
        const object = {};

        // consume results as a stream (best performance)
        const query = CONSTRUCT_QUERY.replaceAll('{resource}', `${url}`);
        const bindingsStream = await engine.queryQuads(query, { sources });
        bindingsStream.on('data', (quad) => {
            // get term values
            const s = quad.subject.value;
            const p = quad.predicate.value;
            const o = quad.object.value;

            // add to terms to lookup table
            table[s] = quad.subject;
            table[p] = quad.predicate;
            table[o] = quad.object;

            // if target is subject
            if (s == url) {
                subject[p] = subject[p] || [];
                pushIfNotExists(subject[p], o);
            }

            // if target is property
            if (p == url) {
                pushIfNotExists(property, [s, o]);
            }

            // if target is object
            if (o == url) {
                object[p] = object[p] || [];
                pushIfNotExists(object[p], s);
            }
        });
        return new Promise(resolve => {
            bindingsStream.on('end', () =>
                resolve({ url, table, subject, property, object }));
        });
    }
}

export { hbs, visit };