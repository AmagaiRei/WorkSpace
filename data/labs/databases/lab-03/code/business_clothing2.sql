SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Business_Product_Color;
DROP TABLE IF EXISTS Business_Product_Size;
DROP TABLE IF EXISTS Business_Product;
DROP TABLE IF EXISTS Business_Color;
DROP TABLE IF EXISTS Business_Size;
DROP TABLE IF EXISTS Business_Category;
DROP TABLE IF EXISTS Business_Brand;
DROP TABLE IF EXISTS Business_User;
DROP TABLE IF EXISTS Business_Order;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE Business_Category (
  category_id INT PRIMARY KEY,
  category_name VARCHAR(50) NOT NULL,
  description VARCHAR(200)
);

CREATE TABLE Business_Brand (
  brand_id INT PRIMARY KEY,
  brand_name VARCHAR(50) NOT NULL,
  description VARCHAR(200)
);

CREATE TABLE Business_Color (
  color_id INT PRIMARY KEY,
  color_name VARCHAR(30) NOT NULL
);

CREATE TABLE Business_Size (
  size_id INT PRIMARY KEY,
  size_name VARCHAR(10) NOT NULL
);

CREATE TABLE Business_User (
  user_id INT PRIMARY KEY,
  login VARCHAR(40) NOT NULL UNIQUE,
  email VARCHAR(100),
  user_role VARCHAR(30) NOT NULL
);

CREATE TABLE Business_Product (
  product_id INT PRIMARY KEY,
  product_name VARCHAR(100) NOT NULL,
  brand_id INT NOT NULL,
  category_id INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (brand_id) REFERENCES Business_Brand(brand_id),
  FOREIGN KEY (category_id) REFERENCES Business_Category(category_id)
);

CREATE TABLE Business_Order (
  order_id INT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  order_status VARCHAR(30) NOT NULL,
  order_date DATE NOT NULL,
  FOREIGN KEY (user_id) REFERENCES Business_User(user_id),
  FOREIGN KEY (product_id) REFERENCES Business_Product(product_id)
);

CREATE TABLE Business_Product_Size (
  product_id INT NOT NULL,
  size_id INT NOT NULL,
  stock_quantity INT NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, size_id),
  FOREIGN KEY (product_id) REFERENCES Business_Product(product_id),
  FOREIGN KEY (size_id) REFERENCES Business_Size(size_id)
);

CREATE TABLE Business_Product_Color (
  product_id INT NOT NULL,
  color_id INT NOT NULL,
  PRIMARY KEY (product_id, color_id),
  FOREIGN KEY (product_id) REFERENCES Business_Product(product_id),
  FOREIGN KEY (color_id) REFERENCES Business_Color(color_id)
);

INSERT INTO Business_Category VALUES
(1,'Пиджаки и костюмы','Костюмная одежда'),
(2,'Брюки','Классические брюки'),
(3,'Рубашки и блузки','Базовые офисные вещи'),
(4,'Юбки','Юбки делового стиля'),
(5,'Жилеты','Дополнение к костюму'),
(6,'Платья','Деловые платья');

INSERT INTO Business_Brand VALUES
(1,'Nord Line','Классическая деловая одежда'),
(2,'Office Style','Брюки и базовые вещи'),
(3,'Forma','Рубашки и костюмные модели'),
(4,'Elegance','Деловая одежда и аксессуары'),
(5,'Business Wear','Костюмы'),
(6,'Urban Office','Сумки и портфели');

INSERT INTO Business_Color VALUES
(1,'Чёрный'),(2,'Тёмно-синий'),(3,'Белый'),
(4,'Серый'),(5,'Бежевый'),(6,'Бордовый');

INSERT INTO Business_Size VALUES
(1,'XS'),(2,'S'),(3,'M'),(4,'L'),(5,'XL'),(6,'XXL');

INSERT INTO Business_User VALUES
(1,'client_01','client01@example.com','Покупатель'),
(2,'client_02','client02@example.com','Покупатель'),
(3,'manager_01','manager@example.com','Менеджер'),
(4,'admin','admin@example.com','Администратор'),
(5,'client_03','client03@example.com','Покупатель'),
(6,'guest','guest@example.com','Гость');

INSERT INTO Business_Product VALUES
(1,'Классический пиджак',1,1,7990.00),
(2,'Брюки прямого кроя',2,2,4290.00),
(3,'Белая офисная рубашка',3,3,2490.00),
(4,'Юбка-карандаш',4,4,3190.00),
(5,'Жилет классический',1,5,3690.00),
(6,'Деловое платье',3,6,5990.00),
(7,'Костюм-двойка',5,1,12490.00),
(8,'Блузка базовая',4,3,2790.00);

INSERT INTO Business_Order VALUES
(1001,1,1,1,'Оформлен','2026-09-01'),
(1002,1,3,2,'Оплачен','2026-09-02'),
(1003,2,2,1,'В обработке','2026-09-03'),
(1004,2,4,1,'Доставлен','2026-09-04'),
(1005,5,7,1,'Оформлен','2026-09-05'),
(1006,5,8,1,'Оплачен','2026-09-06');

INSERT INTO Business_Product_Size VALUES
(1,2,4),(1,3,8),(1,4,5),(2,3,7),(2,4,6),
(2,5,3),(3,1,5),(3,2,10),(3,3,9),(4,2,6),
(4,3,4),(5,3,3),(5,4,5),(6,2,4),(6,3,7),
(7,4,2),(7,5,3),(8,1,6),(8,2,8);

INSERT INTO Business_Product_Color VALUES
(1,1),(1,2),(1,4),(2,1),(2,2),(2,4),
(3,3),(3,5),(4,1),(4,2),(5,1),(5,2),
(6,1),(6,4),(6,5),(7,1),(7,2),(8,3),(8,5);

SELECT p.product_name AS 'Товар', s.size_name AS 'Размер',
       ps.stock_quantity AS 'Остаток'
FROM Business_Product_Size ps
INNER JOIN Business_Product p ON p.product_id = ps.product_id
INNER JOIN Business_Size s ON s.size_id = ps.size_id
ORDER BY p.product_name, s.size_name;

SELECT p.product_name AS 'Товар', c.color_name AS 'Цвет'
FROM Business_Product_Color pc
INNER JOIN Business_Product p ON p.product_id = pc.product_id
INNER JOIN Business_Color c ON c.color_id = pc.color_id
ORDER BY p.product_name, c.color_name;

SELECT p.product_name AS 'Товар', b.brand_name AS 'Бренд',
       cat.category_name AS 'Категория', p.price AS 'Цена'
FROM Business_Product p
INNER JOIN Business_Brand b ON b.brand_id = p.brand_id
INNER JOIN Business_Category cat ON cat.category_id = p.category_id;

SELECT o.order_id AS 'Заказ', u.login AS 'Пользователь',
       p.product_name AS 'Товар', o.order_status AS 'Статус'
FROM Business_Order o
INNER JOIN Business_User u ON u.user_id = o.user_id
INNER JOIN Business_Product p ON p.product_id = o.product_id;