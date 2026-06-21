import openpyxl, sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

wb = openpyxl.load_workbook(
    r'C:\Users\jay\Downloads\hana_ai_excel_practice_student_v3_simplified_errorcheck.xlsx',
    data_only=True
)
ws = wb['거래원장_RAW']

rows = list(ws.iter_rows(min_row=5, values_only=True))
print(f'총 데이터 행: {len(rows)}')

status_cnt = Counter(r[9] for r in rows if r[9])
print(f'처리상태 분포: {dict(status_cnt)}')

trade_types = Counter(r[5] for r in rows if r[5])
print(f'거래유형 종류: {dict(trade_types)}')

prod_types = Counter(r[4] for r in rows if r[4])
print(f'상품유형 종류: {dict(prod_types)}')

print()
normal = [r for r in rows if r[9] == '정상']
print(f'정상 행: {len(normal)}건\n')

VALID_PROD   = {'주식','펀드','채권','ELS','RP'}
VALID_HANJI  = {'매수','매도','가입','해지'}   # 프롬프트 기준
VALID_HWANMAE= {'매수','매도','가입','환매'}   # RAW 실제 용어

err1=[];err2=[];err3=[];err4=[];err5a=[];err5b=[]

for r in normal:
    date,branch,emp,cust,prod,trade,amt,rate,fee,status = r[:10]
    try: amt_f = float(amt) if amt is not None else None
    except: amt_f = None
    try: rate_f = float(rate) if rate is not None else None
    except: rate_f = None
    try: fee_i = int(fee) if fee is not None else None
    except: fee_i = None

    # ① 거래금액 이상
    if amt_f is None or amt_f <= 0:
        err1.append(r)
    # ② 수수료율 이상
    if rate_f is None or rate_f <= 0 or rate_f > 0.005:
        err2.append(r)
    # ③ 수수료금액 불일치
    if amt_f and rate_f and fee_i is not None:
        expected = round(amt_f * rate_f)
        if abs(expected - fee_i) > 1:
            err3.append((r, expected, fee_i))
    # ④ 상품유형 오류
    if prod not in VALID_PROD:
        err4.append(r)
    # ⑤-A 거래유형 (프롬프트: 해지 기준)
    if trade not in VALID_HANJI:
        err5a.append(r)
    # ⑤-B 거래유형 (환매 기준)
    if trade not in VALID_HWANMAE:
        err5b.append(r)

print(f'① 거래금액 이상: {len(err1)}건')
for r in err1:
    print(f'   {r[0]} {r[1]} {r[4]} 거래금액={r[6]}')

print(f'\n② 수수료율 이상: {len(err2)}건')
for r in err2:
    rate_str = f'{float(r[7])*100:.3f}%' if r[7] else 'None'
    print(f'   {r[0]} {r[1]} {r[4]} 수수료율={r[7]} ({rate_str})')

print(f'\n③ 수수료금액 불일치: {len(err3)}건')
for r,exp,act in err3:
    print(f'   {r[0]} {r[1]} {r[4]} fee={act} vs expected={exp} (차이={abs(exp-act)})')

print(f'\n④ 상품유형 오류: {len(err4)}건')
for r in err4:
    print(f'   {r[0]} {r[1]} 상품={r[4]} 거래유형={r[5]}')

print(f'\n⑤-A 거래유형 오류 (허용값=매수/매도/가입/해지): {len(err5a)}건')
for r in err5a:
    print(f'   {r[0]} {r[1]} {r[4]} 거래유형={r[5]}')

print(f'\n⑤-B 거래유형 오류 (허용값=매수/매도/가입/환매): {len(err5b)}건')
for r in err5b:
    print(f'   {r[0]} {r[1]} {r[4]} 거래유형={r[5]}')

# 전체 중복 없이 unique error rows
all_err_rows = set()
for r in err1: all_err_rows.add(r[0:4])
for r in err2: all_err_rows.add(r[0:4])
for r,_,__ in err3: all_err_rows.add(r[0:4])
for r in err4: all_err_rows.add(r[0:4])
for r in err5a: all_err_rows.add(r[0:4])
print(f'\n전체 고유 오류 행 (⑤ 해지기준): {len(all_err_rows)}건')

all_err_rows2 = set()
for r in err1: all_err_rows2.add(r[0:4])
for r in err2: all_err_rows2.add(r[0:4])
for r,_,__ in err3: all_err_rows2.add(r[0:4])
for r in err4: all_err_rows2.add(r[0:4])
for r in err5b: all_err_rows2.add(r[0:4])
print(f'전체 고유 오류 행 (⑤ 환매기준): {len(all_err_rows2)}건')
