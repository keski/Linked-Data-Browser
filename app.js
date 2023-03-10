import express  from 'express';
import { visit } from './utils.js';
import { config } from './resources/config.js';
import NodeCache from 'node-cache';

const port = config.port || 3000;
const cache_ttl = config.cache_ttl || 3000;

const app = express();
const cache = new NodeCache({ stdTTL: cache_ttl, checkperiod: cache_ttl });

app.use('/static', express.static('public'));
app.set('view engine', 'hbs');

app.get('/page/:id', (req, res) => {
    const start = Date.now();
    const resource = req.params.id;
    const cached_data = cache.get(resource);
    if(cached_data === undefined){
        visit(resource).then(data => {
            cache.set(resource, data);
            const delay = Date.now() - start;
            const render_start = Date.now();
            res.render("resource", {...data, ...{delay, render_start}});
        });
    } else {
        const delay = Date.now() - start;
        const render_start = Date.now();
        res.render("resource", {...cached_data, ...{delay, render_start}});
    }
});

app.listen(port, () => {
    console.log(`Linked Data Browser: Listening on port ${port}`);
})
