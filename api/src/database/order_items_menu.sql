USE corazondb;

-- Run once on existing databases (API seed also applies this automatically)
ALTER TABLE order_items ADD COLUMN menu_item_id BIGINT NULL AFTER product_id;
ALTER TABLE order_items MODIFY product_id BIGINT NULL;

ALTER TABLE order_items DROP FOREIGN KEY fk_orderitems_product;

ALTER TABLE order_items
  ADD CONSTRAINT fk_orderitems_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

ALTER TABLE order_items
  ADD CONSTRAINT fk_orderitems_menu
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE SET NULL;
