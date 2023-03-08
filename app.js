import express  from 'express';
import { visit } from './utils.js';
import { config } from './resources/config.js';

const port = config['server.port'] || 3000;
const app = express();

app.use('/static', express.static('public'));
app.set('view engine', 'hbs');

app.get('/page/:id', (req, res) => {
    visit(req.params.id
        ).then(data => res.render("resource", data));
});

app.listen(port, () => {
    console.log(`Linked Data Browser: Listening on port ${port}`);
})
