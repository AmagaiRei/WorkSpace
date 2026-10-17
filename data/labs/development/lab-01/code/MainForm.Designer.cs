namespace FigureLab
{
    partial class MainForm
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null)) components.Dispose();
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.listBox_Primitives = new System.Windows.Forms.ListBox();
            this.button_ColorPen = new System.Windows.Forms.Button();
            this.button_ColorBrush = new System.Windows.Forms.Button();
            this.button_Exit = new System.Windows.Forms.Button();
            this.button_Reset = new System.Windows.Forms.Button();
            this.pictureBox = new System.Windows.Forms.PictureBox();
            this.colorDialog_Pen = new System.Windows.Forms.ColorDialog();
            this.colorDialog_Brush = new System.Windows.Forms.ColorDialog();
            ((System.ComponentModel.ISupportInitialize)(this.pictureBox)).BeginInit();
            this.SuspendLayout();
            
            
            this.listBox_Primitives.FormattingEnabled = true;
            this.listBox_Primitives.Items.AddRange(new object[] {
                "Ничего", "Круг", "Квадрат", "Сектор", "Линия", "Строка", "Дуга",
                "Прямоугольник", "Эллипс", "Две горизонтальные линии", "Три вертикальные линии",
                "Сектор с заданным радиусом", "Снежинка", "Инд. Прямоугольник", "Инд. Эллипс",
                "Инд. Две гориз. линии", "Инд. Три верт. линии", "Инд. Сектор радиусом"});
            this.listBox_Primitives.Location = new System.Drawing.Point(12, 12);
            this.listBox_Primitives.Name = "listBox_Primitives";
            this.listBox_Primitives.Size = new System.Drawing.Size(180, 420);
            this.listBox_Primitives.TabIndex = 0;
            this.listBox_Primitives.SelectedIndexChanged += new System.EventHandler(this.listBox_Primitives_SelectedIndexChanged);
            
            
            this.button_ColorPen.Location = new System.Drawing.Point(12, 440);
            this.button_ColorPen.Name = "button_ColorPen";
            this.button_ColorPen.Size = new System.Drawing.Size(180, 30);
            this.button_ColorPen.Text = "Цвет линии";
            this.button_ColorPen.Click += new System.EventHandler(this.button_ColorPen_Click);
            
            
            this.button_ColorBrush.Location = new System.Drawing.Point(12, 480);
            this.button_ColorBrush.Name = "button_ColorBrush";
            this.button_ColorBrush.Size = new System.Drawing.Size(180, 30);
            this.button_ColorBrush.Text = "Цвет кисти";
            this.button_ColorBrush.Click += new System.EventHandler(this.button_ColorBrush_Click);
            
            
            this.button_Reset.Location = new System.Drawing.Point(12, 520);
            this.button_Reset.Name = "button_Reset";
            this.button_Reset.Size = new System.Drawing.Size(180, 30);
            this.button_Reset.Text = "Сброс _i";
            this.button_Reset.Click += new System.EventHandler(this.button_Reset_Click);
            
            
            this.button_Exit.Location = new System.Drawing.Point(12, 560);
            this.button_Exit.Name = "button_Exit";
            this.button_Exit.Size = new System.Drawing.Size(180, 30);
            this.button_Exit.Text = "Выход";
            this.button_Exit.Click += new System.EventHandler(this.button_Exit_Click);
            
            
            this.pictureBox.BackColor = System.Drawing.Color.White;
            this.pictureBox.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle;
            this.pictureBox.Location = new System.Drawing.Point(210, 12);
            this.pictureBox.Name = "pictureBox";
            this.pictureBox.Size = new System.Drawing.Size(500, 578);
            this.pictureBox.TabIndex = 5;
            this.pictureBox.TabStop = false;
            this.pictureBox.MouseClick += new System.Windows.Forms.MouseEventHandler(this.pictureBox_MouseClick);
            this.pictureBox.Paint += new System.Windows.Forms.PaintEventHandler(this.pictureBox_Paint);
            
            
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(722, 602);
            this.Controls.Add(this.pictureBox);
            this.Controls.Add(this.button_Exit);
            this.Controls.Add(this.button_Reset);
            this.Controls.Add(this.button_ColorBrush);
            this.Controls.Add(this.button_ColorPen);
            this.Controls.Add(this.listBox_Primitives);
            this.Name = "MainForm";
            this.Text = "Графические примитивы - ИП2-26 Мородецкий Р.А";
            ((System.ComponentModel.ISupportInitialize)(this.pictureBox)).EndInit();
            this.ResumeLayout(false);
        }

        private System.Windows.Forms.ListBox listBox_Primitives;
        private System.Windows.Forms.Button button_ColorPen;
        private System.Windows.Forms.Button button_ColorBrush;
        private System.Windows.Forms.Button button_Exit;
        private System.Windows.Forms.Button button_Reset;
        private System.Windows.Forms.PictureBox pictureBox;
        private System.Windows.Forms.ColorDialog colorDialog_Pen;
        private System.Windows.Forms.ColorDialog colorDialog_Brush;
    }
}
