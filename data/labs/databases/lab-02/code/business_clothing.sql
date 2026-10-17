SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS Business_Order;
DROP TABLE IF EXISTS Business_Product;
DROP TABLE IF EXISTS Business_Category;
DROP TABLE IF EXISTS Business_Brand;
DROP TABLE IF EXISTS Business_User;
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
  color VARCHAR(30) NOT NULL,
  size VARCHAR(10) NOT NULL,
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
(6,'Urban Office','Сумки и портфели'),
(7,'Gentleman','Мужские аксессуары');

INSERT INTO Business_User VALUES
(1,'client_01','client01@example.com','Покупатель'),
(2,'client_02','client02@example.com','Покупатель'),
(3,'manager_01','manager@example.com','Менеджер'),
(4,'admin','admin@example.com','Администратор'),
(5,'client_03','client03@example.com','Покупатель'),
(6,'guest','guest@example.com','Гость');

INSERT INTO Business_Product VALUES
(1,'Классический пиджак',1,1,'Чёрный','M',7990.00),
(2,'Брюки прямого кроя',2,2,'Тёмно-синий','L',4290.00),
(3,'Белая офисная рубашка',3,3,'Белый','S',2490.00),
(4,'Юбка-карандаш',4,4,'Тёмно-синий','M',3190.00),
(5,'Жилет классический',1,5,'Чёрный','L',3690.00),
(6,'Деловое платье',3,6,'Серый','M',5990.00),
(7,'Костюм-двойка',5,1,'Чёрный','XL',12490.00),
(8,'Блузка базовая',4,3,'Бежевый','S',2790.00);

INSERT INTO Business_Order VALUES
(1001,1,1,1,'Оформлен','2026-09-01'),
(1002,1,3,2,'Оплачен','2026-09-02'),
(1003,2,2,1,'В обработке','2026-09-03'),
(1004,2,4,1,'Доставлен','2026-09-04'),
(1005,5,7,1,'Оформлен','2026-09-05'),
(1006,5,8,1,'Оплачен','2026-09-06');

SELECT * FROM Business_Category;
SELECT * FROM Business_Brand;
SELECT * FROM Business_User;
SELECT * FROM Business_Product;
SELECT * FROM Business_Order;

SELECT p.product_name AS 'Товар', b.brand_name AS 'Бренд',
       c.category_name AS 'Категория', p.color AS 'Цвет',
       p.size AS 'Размер', p.price AS 'Цена'
FROM Business_Product p
INNER JOIN Business_Brand b ON b.brand_id = p.brand_id
INNER JOIN Business_Category c ON c.category_id = p.category_id;

SELECT o.order_id AS 'Заказ', u.login AS 'Пользователь',
       p.product_name AS 'Товар', o.quantity AS 'Количество',
       o.order_status AS 'Статус', o.order_date AS 'Дата'
FROM Business_Order o
INNER JOIN Business_User u ON u.user_id = o.user_id
INNER JOIN Business_Product p ON p.product_id = o.product_id;
