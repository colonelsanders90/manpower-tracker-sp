// SP list-item base — every list-item type extends this.
//
// The five fields are present on EVERY SP list and are always returned, even
// when not asked for via $select. Lookup fields (and any custom columns) come
// in addition, defined per-list.

export interface SPListItem {
  Id: number;
  Title: string;
  Created: string; // ISO 8601
  Modified: string; // ISO 8601
  Author: { Title: string };
  Editor: { Title: string };
}

/**
 * Lookup field shape returned by the SP REST API with `odata=verbose` and
 * `$expand=<FieldName>`. Without expand you only get `<FieldName>Id` (number).
 */
export interface SPLookup {
  Id: number;
  Title: string;
}
