using System;
using System.Drawing;
using System.Windows.Forms;

namespace FigureLab
{
    public partial class MainForm : Form
    {
        private int _x = 0;
        private int _y = 0;
        private Color _colorPen = Color.Black;
        private Color _colorBrush = Color.Blue;
        private int _i = 0;
        private const int Num = 22600;

        public MainForm()
        {
            InitializeComponent();
            listBox_Primitives.SelectedIndex = 0;
        }

        private void listBox_Primitives_SelectedIndexChanged(object sender, EventArgs e)
        {
            pictureBox.Invalidate();
        }

        private void pictureBox_MouseClick(object sender, MouseEventArgs e)
        {
            _x = e.X;
            _y = e.Y;
            pictureBox.Invalidate();
        }

        private void pictureBox_Paint(object sender, PaintEventArgs e)
        {
            Graphics _gr = e.Graphics;
            Pen pn = new Pen(_colorPen, 2);
            SolidBrush sb = new SolidBrush(_colorBrush);

            int index = listBox_Primitives.SelectedIndex;
            switch (index)
            {
                case 0:
                    break; 
                case 1:
                    _gr.DrawEllipse(pn, _x - 50, _y - 50, 100, 100);
                    break; 
                case 2:
                    _gr.DrawRectangle(pn, _x - 50, _y - 50, 100, 100);
                    break; 
                case 3: 
                    _gr.DrawPie(pn, _x - 50, _y - 50, 100, 100, 0, 120);
                    _gr.FillPie(sb, _x - 50, _y - 50, 100, 100, 0, 120);
                    break;
                case 4:
                    _gr.DrawLine(pn, _x - 50, _y - 50, _x + 50, _y + 50);
                    break; 
                case 5:
                    _gr.DrawString($"X: {_x}, Y: {_y}", this.Font, sb, _x, _y);
                    break; 
                case 6:
                    _gr.DrawArc(pn, _x - 50, _y - 50, 100, 100, 0, 90);
                    break; 
                case 7:
                    _gr.DrawRectangle(pn, _x - 50, _y - 25, 100, 50);
                    break; 
                case 8:
                    _gr.DrawEllipse(pn, _x - 50, _y - 25, 100, 50);
                    break; 
                case 9: 
                    _gr.DrawLine(pn, _x - 50, _y - 25, _x + 50, _y - 25);
                    _gr.DrawLine(pn, _x - 50, _y + 25, _x + 50, _y + 25);
                    break;
                case 10: 
                    _gr.DrawLine(pn, _x - 30, _y - 50, _x - 30, _y + 50);
                    _gr.DrawLine(pn, _x, _y - 50, _x, _y + 50);
                    _gr.DrawLine(pn, _x + 30, _y - 50, _x + 30, _y + 50);
                    break;
                case 11: 
                    _gr.DrawPie(pn, _x - 100, _y - 100, 200, 200, 0, 90);
                    _gr.FillPie(sb, _x - 100, _y - 100, 200, 200, 0, 90);
                    break;
                case 12: 
                    _gr.DrawLine(pn, _x, _y - 50, _x, _y + 50);
                    _gr.DrawLine(pn, _x - 43, _y - 25, _x + 43, _y + 25);
                    _gr.DrawLine(pn, _x - 43, _y + 25, _x + 43, _y - 25);
                    break;
                
                case 13: 
                    _gr.DrawRectangle(pn, _x - 50, _y - 150, 100, 300);
                    break;
                case 14: 
                    _gr.DrawEllipse(pn, _x - 150, _y - 50, 300, 100);
                    break;
                case 15: 
                    _gr.DrawLine(pn, _x - 50, _y - 150, _x + 50, _y - 150);
                    _gr.DrawLine(pn, _x - 50, _y + 150, _x + 50, _y + 150);
                    break;
                case 16: 
                    _gr.DrawLine(pn, _x - 100, _y - 150, _x - 100, _y + 150);
                    _gr.DrawLine(pn, _x, _y - 150, _x, _y + 150);
                    _gr.DrawLine(pn, _x + 100, _y - 150, _x + 100, _y + 150);
                    break;
                case 17: 
                    _gr.DrawPie(pn, _x - 100, _y - 100, 200, 200, 0, 90 + _i);
                    _gr.FillPie(sb, _x - 100, _y - 100, 200, 200, 0, 90 + _i);
                    break;
            }
            
            _i = _i + 24;
        }

        private void button_ColorPen_Click(object sender, EventArgs e)
        {
            if (colorDialog_Pen.ShowDialog() == DialogResult.OK)
            {
                _colorPen = colorDialog_Pen.Color;
                pictureBox.Invalidate();
            }
        }

        private void button_ColorBrush_Click(object sender, EventArgs e)
        {
            if (colorDialog_Brush.ShowDialog() == DialogResult.OK)
            {
                _colorBrush = colorDialog_Brush.Color;
                pictureBox.Invalidate();
            }
        }

        private void button_Exit_Click(object sender, EventArgs e)
        {
            Application.Exit();
        }

        private void button_Reset_Click(object sender, EventArgs e)
        {
            _i = 0;
            pictureBox.Invalidate();
        }
    }
}
