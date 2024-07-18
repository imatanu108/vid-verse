# Aggregation Operators

### 1. `$match`
Filters documents based on specified conditions.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "status": "A", "amount": 100 },
    { "_id": 2, "product": "Widget", "status": "B", "amount": 200 },
    { "_id": 3, "product": "Gadget", "status": "A", "amount": 300 },
    { "_id": 4, "product": "Gadget", "status": "C", "amount": 400 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $match: { status: "A" } }
])
```

#### Result:
```json
[
    { "_id": 1, "product": "Widget", "status": "A", "amount": 100 },
    { "_id": 3, "product": "Gadget", "status": "A", "amount": 300 }
]
```

### 2. `$lookup`
Joins documents from another collection.

#### Sample Input Documents (`orders` collection):
```json
[
    { "_id": 1, "productId": "W123", "quantity": 10 },
    { "_id": 2, "productId": "G123", "quantity": 20 }
]
```

#### Sample Input Documents (`inventory` collection):
```json
[
    { "sku": "W123", "description": "Widget", "price": 100 },
    { "sku": "G123", "description": "Gadget", "price": 200 }
]
```

#### Aggregation Pipeline:
```javascript
db.orders.aggregate([
    {
        $lookup: {
            from: "inventory",
            localField: "productId",
            foreignField: "sku",
            as: "inventory_docs"
        }
    }
])
```

#### Result:
```json
[
    {
        "_id": 1,
        "productId": "W123",
        "quantity": 10,
        "inventory_docs": [
            { "sku": "W123", "description": "Widget", "price": 100 }
        ]
    },
    {
        "_id": 2,
        "productId": "G123",
        "quantity": 20,
        "inventory_docs": [
            { "sku": "G123", "description": "Gadget", "price": 200 }
        ]
    }
]
```

### 3. `$project`
Includes or excludes specific fields from the documents.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "status": "A", "amount": 100 },
    { "_id": 2, "product": "Widget", "status": "B", "amount": 200 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $project: { product: 1, amount: 1, _id: 0 } }
])
```

#### Result:
```json
[
    { "product": "Widget", "amount": 100 },
    { "product": "Widget", "amount": 200 }
]
```

### 4. `$sort`
Sorts documents by a specified field.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Gadget", "amount": 200 },
    { "_id": 3, "product": "Widget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $sort: { amount: -1 } }
])
```

#### Result:
```json
[
    { "_id": 2, "product": "Gadget", "amount": 200 },
    { "_id": 3, "product": "Widget", "amount": 150 },
    { "_id": 1, "product": "Widget", "amount": 100 }
]
```


### 5. `$group`
Groups input documents by a specified identifier expression and applies the accumulator expressions.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Widget", "amount": 200 },
    { "_id": 3, "product": "Gadget", "amount": 300 },
    { "_id": 4, "product": "Gadget", "amount": 400 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    {
        $group: {
            _id: "$product",
            totalSales: { $sum: "$amount" },
            averageSales: { $avg: "$amount" },
            maxSale: { $max: "$amount" },
            minSale: { $min: "$amount" },
            count: { $sum: 1 }
        }
    }
])
```

#### Result:
```json
[
    {
        "_id": "Widget",
        "totalSales": 300,
        "averageSales": 150,
        "maxSale": 200,
        "minSale": 100,
        "count": 2
    },
    {
        "_id": "Gadget",
        "totalSales": 700,
        "averageSales": 350,
        "maxSale": 400,
        "minSale": 300,
        "count": 2
    }
]
```

#### Explanation:
- **`_id: "$product"`**: Groups documents by the `product` field.
- **`totalSales: { $sum: "$amount" }`**: Calculates the total sales for each product.
- **`averageSales: { $avg: "$amount" }`**: Calculates the average sales for each product.
- **`maxSale: { $max: "$amount" }`**: Finds the maximum sale amount for each product.
- **`minSale: { $min: "$amount" }`**: Finds the minimum sale amount for each product.
- **`count: { $sum: 1 }`**: Counts the number of sales documents for each product.


### 6. `$limit`
Limits the number of documents passed to the next stage.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Gadget", "amount": 200 },
    { "_id": 3, "product": "Widget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $limit: 2 }
])
```

#### Result:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Gadget", "amount": 200 }
]
```

### 7. `$skip`
Skips the first N documents and passes the rest.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Gadget", "amount": 200 },
    { "_id": 3, "product": "Widget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $skip: 1 }
])
```

#### Result:
```json
[
    { "_id": 2, "product": "Gadget", "amount": 200 },
    { "_id": 3, "product": "Widget", "amount": 150 }
]
```

### 8. `$unwind`
Deconstructs an array field from the input documents to output a document for each element.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "sizes": ["S", "M", "L"] },
    { "_id": 2, "product": "Gadget", "sizes": ["M", "L"] }
]
```

#### Aggregation Pipeline:
```javascript
db.products.aggregate([
    { $unwind: "$sizes" }
])
```

#### Result:
```json
[
    { "_id": 1, "product": "Widget", "sizes": "S" },
    { "_id": 1, "product": "Widget", "sizes": "M" },
    { "_id": 1, "product": "Widget", "sizes": "L" },
    { "_id": 2, "product": "Gadget", "sizes": "M" },
    { "_id": 2, "product": "Gadget", "sizes": "L" }
]
```

### 9. `$addFields`
Adds new fields to documents.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "quantity": 10, "price": 100 },
    { "_id": 2, "product": "Gadget", "quantity": 20, "price": 200 }
]
```

#### Aggregation Pipeline:
```javascript
db.orders.aggregate([
    { $addFields: { totalPrice: { $multiply: ["$quantity", "$price"] } } }
])
```

#### Result:
```json
[
    { "_id": 1, "product": "Widget", "quantity": 10, "price": 100, "totalPrice": 1000 },
    { "_id": 2, "product": "Gadget", "quantity": 20, "price": 200, "totalPrice": 4000 }
]
```

### 10. `$set`
Alias for `$addFields`.

#### Aggregation Pipeline:
Equivalent to the above example:
```javascript
db.orders.aggregate([
    { $set: { totalPrice: { $multiply: ["$quantity", "$price"] } } }
])
```

### 11. `$count`
Counts the number of documents.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Widget", "amount": 200 },
    { "_id": 3, "product": "Gadget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $count: "totalCount" }
])
```

#### Result:
```json
[
    { "totalCount": 3 }
]
```

### 12. `$facet`
Processes multiple aggregation pipelines within a single stage on the same set of input documents.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product

": "Widget", "amount": 100 },
    { "_id": 2, "product": "Widget", "amount": 200 },
    { "_id": 3, "product": "Gadget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    {
        $facet: {
            countPipeline: [{ $count: "totalCount" }],
            avgAmountPipeline: [{ $group: { _id: null, avgAmount: { $avg: "$amount" } } }]
        }
    }
])
```

#### Result:
```json
[
    {
        "countPipeline": [
            { "totalCount": 3 }
        ],
        "avgAmountPipeline": [
            { "_id": null, "avgAmount": 150 }
        ]
    }
]
```

### 13. `$out`
Writes the resulting documents of the aggregation pipeline to a specified collection.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Widget", "amount": 200 },
    { "_id": 3, "product": "Gadget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $group: { _id: "$product", totalSales: { $sum: "$amount" } } },
    { $out: "summary" }
])
```

#### Result in `summary` collection:
```json
[
    { "_id": "Widget", "totalSales": 300 },
    { "_id": "Gadget", "totalSales": 150 }
]
```

### 14. `$merge`
Merges the resulting documents into a specified collection, allowing for updates and insertions.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "amount": 100 },
    { "_id": 2, "product": "Widget", "amount": 200 },
    { "_id": 3, "product": "Gadget", "amount": 150 }
]
```

#### Aggregation Pipeline:
```javascript
db.sales.aggregate([
    { $group: { _id: "$product", totalSales: { $sum: "$amount" } } },
    { $merge: { into: "summary", whenMatched: "merge", whenNotMatched: "insert" } }
])
```

#### Result in `summary` collection:
```json
[
    { "_id": "Widget", "totalSales": 300 },
    { "_id": "Gadget", "totalSales": 150 }
]
```


Certainly! Here's the detailed explanation of the `$group` operator with a sample input and the resulting output:


### 15. `$replaceRoot`
Replaces the input document with the specified document.

#### Sample Input Documents:
```json
[
    { "_id": 1, "product": "Widget", "item": { "name": "Widget", "price": 100 } },
    { "_id": 2, "product": "Gadget", "item": { "name": "Gadget", "price": 200 } }
]
```

#### Aggregation Pipeline:
```javascript
db.orders.aggregate([
    { $replaceRoot: { newRoot: "$item" } }
])
```

#### Result:
```json
[
    { "name": "Widget", "price": 100 },
    { "name": "Gadget", "price": 200 }
]
```
