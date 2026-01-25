const categories = [
  {
    name: "Groceries",
    type: "Essential",
    budget: "$400",
  },
  {
    name: "Dining",
    type: "Lifestyle",
    budget: "$220",
  },
  {
    name: "Utilities",
    type: "Essential",
    budget: "$180",
  },
  {
    name: "Travel",
    type: "Goals",
    budget: "$300",
  },
];

export default function CategoriesPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="opacity-70 mt-2">
            Organize spending with clear budgets and labels.
          </p>
        </div>
        <button className="btn btn-primary btn-sm">Add category</button>
      </div>

      <div className="card bg-base-100 shadow">
        <div className="card-body">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Monthly budget</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.name}>
                    <td className="font-medium">{category.name}</td>
                    <td>
                      <span className="badge badge-outline">
                        {category.type}
                      </span>
                    </td>
                    <td>{category.budget}</td>
                    <td className="text-right">
                      <button className="btn btn-ghost btn-xs">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
