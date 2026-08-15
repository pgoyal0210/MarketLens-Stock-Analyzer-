import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataFile = path.join(__dirname, 'data.json');

const loadData = () => {
    if (!fs.existsSync(dataFile)) {
        return { users: [], portfolios: [], messages: [] };
    }
    try {
        return JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
    } catch (err) {
        return { users: [], portfolios: [], messages: [] };
    }
};

const saveData = (data) => {
    fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
};

export const store = loadData();

export const saveStore = () => {
    saveData(store);
};
