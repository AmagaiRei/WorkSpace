namespace WinFormsApp_SymbolsOfStrings
{
    partial class form_Main
    {
        private System.ComponentModel.IContainer components = null;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.label_AboutInput = new System.Windows.Forms.Label();
            this.label_AboutLetter = new System.Windows.Forms.Label();
            this.listBox_Input = new System.Windows.Forms.ListBox();
            this.textBox_Letter = new System.Windows.Forms.TextBox();
            this.button_Open = new System.Windows.Forms.Button();
            this.button_Clear = new System.Windows.Forms.Button();
            this.button_Exit = new System.Windows.Forms.Button();
            this.button_FindLetter = new System.Windows.Forms.Button();
            this.button_Individual = new System.Windows.Forms.Button();
            this.openFileDialog = new System.Windows.Forms.OpenFileDialog();
            this.menuStrip = new System.Windows.Forms.MenuStrip();
            this.ToolStripMenu_File = new System.Windows.Forms.ToolStripMenuItem();
            this.ToolStripMenu_Open = new System.Windows.Forms.ToolStripMenuItem();
            this.ToolStripMenu_Clear = new System.Windows.Forms.ToolStripMenuItem();
            this.ToolStripMenu_Exit = new System.Windows.Forms.ToolStripMenuItem();
            this.ToolStripMenu_Help = new System.Windows.Forms.ToolStripMenuItem();
            this.ToolStripMenu_About = new System.Windows.Forms.ToolStripMenuItem();
            this.statusStrip = new System.Windows.Forms.StatusStrip();
            this.toolStripStatusLabel = new System.Windows.Forms.ToolStripStatusLabel();
            this.menuStrip.SuspendLayout();
            this.statusStrip.SuspendLayout();
            this.SuspendLayout();
            this.label_AboutInput.AutoSize = true;
            this.label_AboutInput.Location = new System.Drawing.Point(20, 40);
            this.label_AboutInput.Name = "label_AboutInput";
            this.label_AboutInput.Size = new System.Drawing.Size(120, 15);
            this.label_AboutInput.TabIndex = 0;
            this.label_AboutInput.Text = "Набор строк для поиска";
            this.label_AboutLetter.AutoSize = true;
            this.label_AboutLetter.Location = new System.Drawing.Point(290, 40);
            this.label_AboutLetter.Name = "label_AboutLetter";
            this.label_AboutLetter.Size = new System.Drawing.Size(80, 15);
            this.label_AboutLetter.TabIndex = 1;
            this.label_AboutLetter.Text = "Буква поиска";
            this.listBox_Input.FormattingEnabled = true;
            this.listBox_Input.HorizontalScrollbar = true;
            this.listBox_Input.ItemHeight = 15;
            this.listBox_Input.Items.AddRange(new object[] {
            "Употребляйте с пользой время,",
            "Учиться надо по системе.",
            "Сперва хочу вам в долг вменить",
            "На курсы логики ходить.",
            "Ваш ум, нетронутый доныне,",
            "На них приучат к дисциплине,",
            "Чтоб взял он направленья ось,",
            "Не разбредаясь вкривь и вкось."});
            this.listBox_Input.Location = new System.Drawing.Point(20, 65);
            this.listBox_Input.Name = "listBox_Input";
            this.listBox_Input.Size = new System.Drawing.Size(240, 139);
            this.listBox_Input.TabIndex = 2;
            this.textBox_Letter.Location = new System.Drawing.Point(310, 70);
            this.textBox_Letter.MaxLength = 1;
            this.textBox_Letter.Name = "textBox_Letter";
            this.textBox_Letter.Size = new System.Drawing.Size(40, 23);
            this.textBox_Letter.TabIndex = 3;
            this.textBox_Letter.TextAlign = System.Windows.Forms.HorizontalAlignment.Center;
            this.textBox_Letter.TextChanged += new System.EventHandler(this.textBox_Letter_TextChanged);
            this.button_FindLetter.Enabled = false;
            this.button_FindLetter.Location = new System.Drawing.Point(280, 110);
            this.button_FindLetter.Name = "button_FindLetter";
            this.button_FindLetter.Size = new System.Drawing.Size(100, 30);
            this.button_FindLetter.TabIndex = 4;
            this.button_FindLetter.Text = "Посчитат";
            this.button_FindLetter.UseVisualStyleBackColor = true;
            this.button_FindLetter.Click += new System.EventHandler(this.button_FindLetter_Click);
            this.button_Individual.Location = new System.Drawing.Point(280, 150);
            this.button_Individual.Name = "button_Individual";
            this.button_Individual.Size = new System.Drawing.Size(100, 54);
            this.button_Individual.TabIndex = 5;
            this.button_Individual.Text = "Индивидуальное задание";
            this.button_Individual.UseVisualStyleBackColor = true;
            this.button_Individual.Click += new System.EventHandler(this.button_Individual_Click);
            this.button_Open.Location = new System.Drawing.Point(20, 218);
            this.button_Open.Name = "button_Open";
            this.button_Open.Size = new System.Drawing.Size(100, 30);
            this.button_Open.TabIndex = 6;
            this.button_Open.Text = "Открыть";
            this.button_Open.UseVisualStyleBackColor = true;
            this.button_Open.Click += new System.EventHandler(this.button_Open_Click);
            this.button_Clear.Location = new System.Drawing.Point(150, 218);
            this.button_Clear.Name = "button_Clear";
            this.button_Clear.Size = new System.Drawing.Size(100, 30);
            this.button_Clear.TabIndex = 7;
            this.button_Clear.Text = "Очистить";
            this.button_Clear.UseVisualStyleBackColor = true;
            this.button_Clear.Click += new System.EventHandler(this.button_Clear_Click);
            this.button_Exit.Location = new System.Drawing.Point(280, 218);
            this.button_Exit.Name = "button_Exit";
            this.button_Exit.Size = new System.Drawing.Size(100, 30);
            this.button_Exit.TabIndex = 8;
            this.button_Exit.Text = "Выход";
            this.button_Exit.UseVisualStyleBackColor = true;
            this.button_Exit.Click += new System.EventHandler(this.button_Exit_Click);
            this.openFileDialog.Filter = "*.txt|*.txt";
            this.menuStrip.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.ToolStripMenu_File,
            this.ToolStripMenu_Help});
            this.menuStrip.Location = new System.Drawing.Point(0, 0);
            this.menuStrip.Name = "menuStrip";
            this.menuStrip.Size = new System.Drawing.Size(404, 24);
            this.menuStrip.TabIndex = 9;
            this.ToolStripMenu_File.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.ToolStripMenu_Open,
            this.ToolStripMenu_Clear,
            this.ToolStripMenu_Exit});
            this.ToolStripMenu_File.Name = "ToolStripMenu_File";
            this.ToolStripMenu_File.Size = new System.Drawing.Size(48, 20);
            this.ToolStripMenu_File.Text = "&Файл";
            this.ToolStripMenu_Open.Name = "ToolStripMenu_Open";
            this.ToolStripMenu_Open.Size = new System.Drawing.Size(180, 22);
            this.ToolStripMenu_Open.Text = "&Открыть";
            this.ToolStripMenu_Open.Click += new System.EventHandler(this.button_Open_Click);
            this.ToolStripMenu_Clear.Name = "ToolStripMenu_Clear";
            this.ToolStripMenu_Clear.Size = new System.Drawing.Size(180, 22);
            this.ToolStripMenu_Clear.Text = "О&чистить";
            this.ToolStripMenu_Clear.Click += new System.EventHandler(this.button_Clear_Click);
            this.ToolStripMenu_Exit.Name = "ToolStripMenu_Exit";
            this.ToolStripMenu_Exit.Size = new System.Drawing.Size(180, 22);
            this.ToolStripMenu_Exit.Text = "В&ыход";
            this.ToolStripMenu_Exit.Click += new System.EventHandler(this.button_Exit_Click);
            this.ToolStripMenu_Help.DropDownItems.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.ToolStripMenu_About});
            this.ToolStripMenu_Help.Name = "ToolStripMenu_Help";
            this.ToolStripMenu_Help.Size = new System.Drawing.Size(65, 20);
            this.ToolStripMenu_Help.Text = "&Помощь";
            this.ToolStripMenu_About.Name = "ToolStripMenu_About";
            this.ToolStripMenu_About.Size = new System.Drawing.Size(180, 22);
            this.ToolStripMenu_About.Text = "О &программе";
            this.ToolStripMenu_About.Click += new System.EventHandler(this.ToolStripMenu_About_Click);
            this.statusStrip.Items.AddRange(new System.Windows.Forms.ToolStripItem[] {
            this.toolStripStatusLabel});
            this.statusStrip.Location = new System.Drawing.Point(0, 264);
            this.statusStrip.Name = "statusStrip";
            this.statusStrip.Size = new System.Drawing.Size(404, 22);
            this.statusStrip.TabIndex = 10;
            this.toolStripStatusLabel.Name = "toolStripStatusLabel";
            this.toolStripStatusLabel.Size = new System.Drawing.Size(179, 17);
            this.toolStripStatusLabel.Text = "Приложение загружено успешно";
            this.AutoScaleDimensions = new System.Drawing.SizeF(7F, 15F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(404, 286);
            this.Controls.Add(this.label_AboutInput);
            this.Controls.Add(this.label_AboutLetter);
            this.Controls.Add(this.listBox_Input);
            this.Controls.Add(this.textBox_Letter);
            this.Controls.Add(this.button_FindLetter);
            this.Controls.Add(this.button_Individual);
            this.Controls.Add(this.button_Open);
            this.Controls.Add(this.button_Clear);
            this.Controls.Add(this.button_Exit);
            this.Controls.Add(this.menuStrip);
            this.Controls.Add(this.statusStrip);
            this.FormBorderStyle = System.Windows.Forms.FormBorderStyle.FixedSingle;
            this.MainMenuStrip = this.menuStrip;
            this.MaximizeBox = false;
            this.Name = "form_Main";
            this.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
            this.Text = "Работа со строками";
            this.menuStrip.ResumeLayout(false);
            this.menuStrip.PerformLayout();
            this.statusStrip.ResumeLayout(false);
            this.statusStrip.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();
        }

        private System.Windows.Forms.Label label_AboutInput;
        private System.Windows.Forms.Label label_AboutLetter;
        private System.Windows.Forms.ListBox listBox_Input;
        private System.Windows.Forms.TextBox textBox_Letter;
        private System.Windows.Forms.Button button_Open;
        private System.Windows.Forms.Button button_Clear;
        private System.Windows.Forms.Button button_Exit;
        private System.Windows.Forms.Button button_FindLetter;
        private System.Windows.Forms.Button button_Individual;
        private System.Windows.Forms.OpenFileDialog openFileDialog;
        private System.Windows.Forms.MenuStrip menuStrip;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_File;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_Open;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_Clear;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_Exit;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_Help;
        private System.Windows.Forms.ToolStripMenuItem ToolStripMenu_About;
        private System.Windows.Forms.StatusStrip statusStrip;
        private System.Windows.Forms.ToolStripStatusLabel toolStripStatusLabel;
    }
}
