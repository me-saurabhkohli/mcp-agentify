# Flask example
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify({'products': []})

@app.route('/api/products', methods=['POST'])
def create_product():
    return jsonify({'message': 'Product created'})

@app.route('/api/products/<int:id>', methods=['GET'])
def get_product(id):
    return jsonify({'product': {'id': id}})

@app.route('/api/products/<int:id>', methods=['PUT'])
def update_product(id):
    return jsonify({'message': f'Product {id} updated'})

@app.route('/api/products/<int:id>', methods=['DELETE'])
def delete_product(id):
    return jsonify({'message': f'Product {id} deleted'})

@app.route('/api/categories', methods=['GET', 'POST'])
def categories():
    if request.method == 'GET':
        return jsonify({'categories': []})
    else:
        return jsonify({'message': 'Category created'})

if __name__ == '__main__':
    app.run(debug=True)