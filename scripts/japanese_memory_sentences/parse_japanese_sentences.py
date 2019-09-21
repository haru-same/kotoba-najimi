import csv
import sys
import io

out_text = ''

def AppendWithoutKanji(text):
	global out_text

	for c in text:
		if c != '[' and c != ']' and c != ' ' and ord(c) <= ord('ヿ'):
			out_text += c

	out_text += '\n'

with open('japanese_sentences_cleaned.csv', 'r', encoding='utf-8') as csv_file:
	# line = csv_file.readline()
	# cnt = 1
	# while line:
	# 	print(u"Line {}: {}".format(cnt, line.strip()))
	# 	out_text += line
	# 	line = csv_file.readline()
	# 	cnt += 1
	# 	if cnt > 2:
	# 		break

	csv_reader = csv.reader(csv_file, delimiter=',')
	for index, row in enumerate(csv_reader):
		if index == 0:
			continue

		fact_text_row = row[6].split('|')
		out_text += fact_text_row[0] + '|'
		AppendWithoutKanji(fact_text_row[2])

with open('japanese_sentences_parsed.txt', 'w', encoding='utf-8') as f:
	f.write(out_text)