out_bytes = []
count = 0
with open('japanese_sentences.csv', 'rb') as f:
	byte = f.read(1)

	if byte == b'\x1f':
		out_bytes.append(b'|')
	else:
		out_bytes.append(byte)

	while byte != b"":
		count += 1
		# if count >= 1000:
		# 	break

		# Do stuff with byte.
		# print(byte)
		byte = f.read(1)

		if byte == b'\x1f':
			out_bytes.append(b'|')
		else:
			out_bytes.append(byte)

with open('japanese_sentences_cleaned.csv', 'wb') as f:
	f.write(b''.join(out_bytes))
