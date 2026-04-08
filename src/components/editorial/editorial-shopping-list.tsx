import type { ShoppingList, Component } from '@/lib/types/recipe';

interface EditorialShoppingListProps {
  shoppingList: ShoppingList | undefined;
  components?: Component[];
}

export function EditorialShoppingList({ shoppingList, components }: EditorialShoppingListProps) {
  // If we have proper shopping_list data, use it
  const hasShoppingList = shoppingList?.grouped_by_section && shoppingList.grouped_by_section.length > 0;

  // If no shopping list but we have components, build one from ingredients
  if (!hasShoppingList && (!components || components.length === 0)) {
    return null;
  }

  if (!hasShoppingList && components) {
    // Build a flat ingredient list from all components
    return (
      <div>
        {components.map((comp, compIdx) => (
          <div
            key={comp.id || comp.name || compIdx}
            style={{
              borderTop: compIdx > 0 ? '1px solid var(--ed-border)' : undefined,
              paddingTop: compIdx > 0 ? 'var(--ed-spacing-subsection)' : undefined,
              marginTop: compIdx > 0 ? 'var(--ed-spacing-subsection)' : undefined,
            }}
          >
            <h3 style={{
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              color: 'var(--ed-text-muted)',
              margin: '0 0 12px',
            }}>
              {comp.name}
            </h3>
            {comp.ingredients?.map((ing, ingIdx) => (
              <p
                key={ing.id || `${ing.name}-${ingIdx}`}
                style={{
                  margin: 0,
                  lineHeight: 1.8,
                  fontSize: 'var(--ed-fs-body)',
                }}
              >
                {(ing.amount > 0 || ing.unit) && (
                  <span style={{ fontWeight: 600 }}>
                    {ing.amount > 0 ? `${ing.amount} ${ing.unit ?? ''}`.trim() : ing.unit || ''}
                  </span>
                )}{' '}
                <span style={{ fontWeight: 400 }}>{ing.name}</span>
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  const pantrySet = new Set(
    (shoppingList.pantry_assumed ?? []).map((name) => name.toLowerCase())
  );

  return (
    <div>
      {/* Quality highlight — the_one_thing */}
      {shoppingList.the_one_thing && (
        <p style={{
          fontStyle: 'italic',
          color: 'var(--ed-text-primary)',
          fontSize: 'var(--ed-fs-body)',
          lineHeight: 1.75,
          margin: '0 0 var(--ed-spacing-subsection)',
        }}>
          {shoppingList.the_one_thing}
        </p>
      )}

      {/* Sections */}
      {shoppingList.grouped_by_section.map((section, sectionIdx) => {
        const isPantryItem = (ingredientName: string) =>
          pantrySet.has(ingredientName.toLowerCase());

        return (
          <div
            key={section.section}
            style={{
              borderTop: sectionIdx > 0 ? '1px solid var(--ed-border)' : undefined,
              paddingTop: sectionIdx > 0 ? 'var(--ed-spacing-subsection)' : undefined,
              marginTop: sectionIdx > 0 ? 'var(--ed-spacing-subsection)' : undefined,
            }}
          >
            {/* Section heading */}
            <h3 style={{
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              fontSize: 'var(--ed-fs-micro)',
              fontWeight: 600,
              color: 'var(--ed-text-muted)',
              margin: '0 0 12px',
            }}>
              {section.section}
            </h3>

            {/* Items */}
            {section.items.map((item, itemIdx) => {
              const inPantry = isPantryItem(item.ingredient_name);

              return (
                <p
                  key={`${item.ingredient_name}-${itemIdx}`}
                  style={{
                    margin: 0,
                    lineHeight: 1.8,
                    fontSize: 'var(--ed-fs-body)',
                    color: inPantry ? 'var(--ed-text-muted)' : undefined,
                    textDecoration: inPantry ? 'line-through' : undefined,
                  }}
                >
                  {item.amount && (
                    <span style={{ fontWeight: 600 }}>{item.amount}</span>
                  )}{' '}
                  <span style={{ fontWeight: 400 }}>{item.ingredient_name}</span>
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
