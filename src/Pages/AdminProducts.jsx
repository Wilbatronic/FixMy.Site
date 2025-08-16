import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Textarea } from '@/Components/ui/textarea';
import { apiJson } from '@/utils/api';

function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: '', description: '', price: '' });
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { ok, data } = await apiJson('/admin/products');
    if (ok) {
      setProducts(data);
    }
  };

  const handleCreate = async () => {
    const { ok, data } = await apiJson('/admin/products', {
      method: 'POST',
      body: JSON.stringify(newProduct),
    });
    if (ok) {
      fetchProducts();
      setNewProduct({ name: '', description: '', price: '' });
    }
  };

  const handleUpdate = async () => {
    const { ok } = await apiJson(`/admin/products/${editingProduct.id}`, {
      method: 'PUT',
      body: JSON.stringify(editingProduct),
    });
    if (ok) {
      fetchProducts();
      setEditingProduct(null);
    }
  };

  const handleDelete = async (id) => {
    const { ok } = await apiJson(`/admin/products/${id}`, { method: 'DELETE' });
    if (ok) {
      fetchProducts();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create New Product</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Name"
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
          />
          <Textarea
            placeholder="Description"
            value={newProduct.description}
            onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
          />
          <Input
            type="number"
            placeholder="Price"
            value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
          />
          <Button onClick={handleCreate}>Create Product</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manage Products</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {products.map((product) => (
              <li key={product.id} className="p-4 border rounded-md">
                {editingProduct && editingProduct.id === product.id ? (
                  <div className="space-y-4">
                    <Input
                      value={editingProduct.name}
                      onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                    />
                    <Textarea
                      value={editingProduct.description}
                      onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    />
                    <Input
                      type="number"
                      value={editingProduct.price}
                      onChange={(e) => setEditingProduct({ ...editingProduct, price: e.target.value })}
                    />
                    <div className="flex space-x-2">
                      <Button onClick={handleUpdate}>Save</Button>
                      <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h3 className="font-bold">{product.name}</h3>
                    <p>{product.description}</p>
                    <p>£{product.price}</p>
                    <div className="flex space-x-2 mt-2">
                      <Button onClick={() => setEditingProduct(product)}>Edit</Button>
                      <Button variant="destructive" onClick={() => handleDelete(product.id)}>Delete</Button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminProducts;
