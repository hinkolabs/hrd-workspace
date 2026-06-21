import openpyxl, sys
sys.stdout.reconfigure(encoding='utf-8')
wb = openpyxl.load_workbook(r'C:\Users\jay\Downloads\hana_ai_excel_practice_student_v3_fixed.xlsx', data_only=True)
ws1 = wb['결과작성_STEP1_보고용집계']
with open('step1_layout.txt','w',encoding='utf-8') as f:
    for r in ws1.iter_rows(min_row=1, max_row=35, values_only=True):
        f.write(str(r) + '\n')
print("done")
