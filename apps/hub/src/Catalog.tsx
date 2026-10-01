import { useState, useEffect } from 'react';
import { Button, Card } from '@chalk/ui';
import { initDb } from './db/store';

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  points_cost: number;
  stock: number;
}

export function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [cost, setCost] = useState(10);
  const [stock, setStock] = useState(10);

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    const db = await initDb();
    const rows = await db.select<CatalogItem[]>('SELECT * FROM catalog ORDER BY name ASC');
    setItems(rows);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = await initDb();
    
    if (editingId) {
      await db.execute(
        'UPDATE catalog SET name = $1, description = $2, points_cost = $3, stock = $4 WHERE id = $5',
        [name, desc, cost, stock, editingId]
      );
    } else {
      const newId = crypto.randomUUID();
      await db.execute(
        'INSERT INTO catalog (id, name, description, points_cost, stock) VALUES ($1, $2, $3, $4, $5)',
        [newId, name, desc, cost, stock]
      );
    }
    
    setEditingId(null);
    setName('');
    setDesc('');
    setCost(10);
    setStock(10);
    await loadCatalog();
  };

  const startEdit = (item: CatalogItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDesc(item.description);
    setCost(item.points_cost);
    setStock(item.stock);
  };

  return (
    <div className="ui-p-4 ui-flex ui-gap-8">
      <div className="ui-flex-1">
        <h2 className="ui-text-2xl ui-font-bold ui-mb-4">Catalog Inventory</h2>
        <div className="ui-flex-col ui-gap-4">
          {items.map(item => (
            <Card key={item.id} className="ui-flex ui-justify-between ui-items-center">
              <div>
                <h3 className="ui-text-lg ui-font-bold">{item.name}</h3>
                <p className="ui-text-sm ui-text-gray-600">{item.description}</p>
                <div className="ui-flex ui-gap-4 ui-mt-2">
                  <span className="ui-font-mono ui-bg-yellow-100 ui-px-2 ui-rounded">Cost: {item.points_cost} points</span>
                  <span className={`ui-font-mono ui-px-2 ui-rounded ${item.stock < 5 ? 'ui-bg-red-100 ui-text-red-700' : 'ui-bg-green-100'}`}>Stock: {item.stock}</span>
                </div>
              </div>
              <Button onClick={() => startEdit(item)}>Edit</Button>
            </Card>
          ))}
          {items.length === 0 && <p>No items in catalog. Add some!</p>}
        </div>
      </div>
      
      <div className="ui-w-80">
        <Card>
          <h3 className="ui-text-xl ui-mb-4">{editingId ? 'Edit Item' : 'Add Item'}</h3>
          <form onSubmit={handleSave} className="ui-flex-col ui-gap-4">
            <label className="ui-flex-col ui-gap-1">
              <span>Name</span>
              <input required value={name} onChange={e => setName(e.target.value)} className="ui-border ui-p-2 ui-rounded" />
            </label>
            <label className="ui-flex-col ui-gap-1">
              <span>Description</span>
              <input value={desc} onChange={e => setDesc(e.target.value)} className="ui-border ui-p-2 ui-rounded" />
            </label>
            <label className="ui-flex-col ui-gap-1">
              <span>Points Cost</span>
              <input required type="number" min="0" value={cost} onChange={e => setCost(parseInt(e.target.value) || 0)} className="ui-border ui-p-2 ui-rounded" />
            </label>
            <label className="ui-flex-col ui-gap-1">
              <span>Stock Quantity</span>
              <input required type="number" min="0" value={stock} onChange={e => setStock(parseInt(e.target.value) || 0)} className="ui-border ui-p-2 ui-rounded" />
            </label>
            <div className="ui-flex ui-gap-2 ui-mt-4">
              <Button type="submit" className="ui-flex-1">{editingId ? 'Save' : 'Add'}</Button>
              {editingId && <Button type="button" onClick={() => setEditingId(null)}>Cancel</Button>}
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
