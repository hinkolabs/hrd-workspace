import openpyxl
wb = openpyxl.load_workbook(r'C:\Users\jay\Downloads\hana_ai_excel_practice_student_v3_fixed.xlsx', data_only=True)
ws_m = wb['직원마스터']
lines = []
for row in ws_m.iter_rows(min_row=4, values_only=True):
    if row[0] and str(row[0]).startswith('E'):
        lines.append(f"{row[0]}|{row[1]}|{row[2]}")
with open('emps_out.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("done")
