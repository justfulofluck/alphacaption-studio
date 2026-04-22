def format_time(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def generate_srt(segments):
    if not segments:
        return ""
    
    srt_lines = []
    
    for i, segment in enumerate(segments, 1):
        start = float(segment.get('start', 0))
        end = float(segment.get('end', 0))
        text = segment.get('text', '').strip()
        
        if not text:
            continue
        
        start_str = format_time(start)
        end_str = format_time(end)
        
        srt_lines.append(f"{i}")
        srt_lines.append(f"{start_str} --> {end_str}")
        srt_lines.append(text)
        srt_lines.append("")
    
    return '\n'.join(srt_lines)


def parse_srt(content):
    import re
    
    segments = []
    blocks = re.split(r'\n\s*\n', content.strip())
    
    for block in blocks:
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
        
        try:
            index = int(lines[0])
            timing = lines[1]
            text = '\n'.join(lines[2:])
            
            match = re.match(r'(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})', timing)
            if match:
                start_str, end_str = match.groups()
                
                start = parse_srt_time(start_str)
                end = parse_srt_time(end_str)
                
                segments.append({
                    'id': f'seg-{index}',
                    'start': start,
                    'end': end,
                    'text': text
                })
        except (ValueError, IndexError):
            continue
    
    return segments


def parse_srt_time(time_str):
    parts = time_str.replace(',', ':').split(':')
    h = int(parts[0])
    m = int(parts[1])
    s = int(parts[2])
    ms = int(parts[3])
    return h * 3600 + m * 60 + s + ms / 1000
