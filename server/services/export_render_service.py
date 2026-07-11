import os
import re
import subprocess
import time
import json
import platform
import threading
import shutil
import urllib.request
from PIL import ImageFont

def hex_to_ass_color(hex_str, default="&HFFFFFF&"):
    if not hex_str:
        return default
    
    hex_str = hex_str.strip()
    
    # Handle rgba(r, g, b, a) format
    if hex_str.startswith('rgba') or hex_str.startswith('rgb'):
        parts = re.findall(r'\d+\.?\d*', hex_str)
        if len(parts) >= 3:
            r = int(parts[0])
            g = int(parts[1])
            b = int(parts[2])
            a = float(parts[3]) if len(parts) >= 4 else 1.0
            trans = int((1.0 - a) * 255)
            return f"&H{trans:02X}{b:02X}{g:02X}{r:02X}&"
            
    hex_str = hex_str.lstrip('#')
    if len(hex_str) == 3:
        hex_str = "".join([c*2 for c in hex_str])
        
    if len(hex_str) == 6:
        r, g, b = hex_str[0:2], hex_str[2:4], hex_str[4:6]
        return f"&H00{b}{g}{r}&"
    elif len(hex_str) == 8:
        r, g, b, a = hex_str[0:2], hex_str[2:4], hex_str[4:6], hex_str[6:8]
        alpha_val = int(a, 16)
        trans_val = 255 - alpha_val
        return f"&H{trans_val:02X}{b}{g}{r}&"
        
    return default

def format_ass_time(seconds):
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    centiseconds = int(round((seconds - int(seconds)) * 100))
    if centiseconds == 100:
        centiseconds = 99
    return f"{hours}:{minutes:02d}:{secs:02d}.{centiseconds:02d}"

def get_video_dimensions(video_path):
    try:
        cmd = [
            'ffprobe', '-v', 'error', 
            '-select_streams', 'v:0', 
            '-show_entries', 'stream=width,height:stream_side_data=rotation', 
            '-of', 'json', 
            video_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        info = json.loads(result.stdout.decode('utf-8'))
        stream = info['streams'][0]
        width = int(stream['width'])
        height = int(stream['height'])
        
        rotation = 0
        side_data_list = stream.get('side_data_list', [])
        for side_data in side_data_list:
            if 'rotation' in side_data:
                rotation = abs(int(side_data['rotation']))
                break
                
        if rotation in (90, 270):
            print(f"[ExportRender] Video is rotated by {rotation} degrees. Swapping dimensions from {width}x{height} to {height}x{width}.")
            return height, width
        return width, height
    except Exception as e:
        print(f"[ExportRender] ffprobe failed to get video dimensions: {e}")
        return 1080, 1920

def prepare_fonts_directory(fonts_dir):
    os.makedirs(fonts_dir, exist_ok=True)
    
    # 1. Copy common Windows system fonts to local folder
    win_fonts_dir = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts')
    common_fonts = {
        'georgia.ttf': 'Georgia', 
        'georgiab.ttf': 'Georgia Bold', 
        'georgiai.ttf': 'Georgia Italic', 
        'georgiaz.ttf': 'Georgia Bold Italic',
        'arial.ttf': 'Arial', 
        'arialbd.ttf': 'Arial Bold', 
        'ariali.ttf': 'Arial Italic', 
        'arialbi.ttf': 'Arial Bold Italic',
        'times.ttf': 'Times New Roman', 
        'timesbd.ttf': 'Times New Roman Bold', 
        'timesi.ttf': 'Times New Roman Italic', 
        'timesbi.ttf': 'Times New Roman Bold Italic'
    }
    for f in common_fonts.keys():
        src = os.path.join(win_fonts_dir, f)
        dst = os.path.join(fonts_dir, f)
        if os.path.exists(src) and not os.path.exists(dst):
            try:
                shutil.copy(src, dst)
            except Exception as e:
                print(f"[Fonts] Could not copy system font {f}: {e}")
                
    # 2. Download Montserrat, Inter, and Playfair Display from Google Fonts CDN
    google_fonts_urls = {
        'montserrat.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Regular.ttf',
        'montserrat_bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Bold.ttf',
        'montserrat_italic.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-Italic.ttf',
        'montserrat_bolditalic.ttf': 'https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat-BoldItalic.ttf',
        'inter.ttf': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Regular.ttf',
        'inter_bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Bold.ttf',
        'inter_italic.ttf': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-Italic.ttf',
        'inter_bolditalic.ttf': 'https://github.com/google/fonts/raw/main/ofl/inter/static/Inter-BoldItalic.ttf',
        'playfair.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Regular.ttf',
        'playfair_italic.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Italic.ttf',
        'playfair_bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-Bold.ttf',
        'playfair_bolditalic.ttf': 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay-BoldItalic.ttf'
    }
    
    # If old/incomplete Inter fonts exist, remove them to force redownloading from static URL
    for old_file in ['inter.ttf', 'inter_bold.ttf']:
        p = os.path.join(fonts_dir, old_file)
        if os.path.exists(p) and os.path.getsize(p) < 5000: # corrupted/invalid
            try:
                os.remove(p)
            except Exception:
                pass
                
    for filename, url in google_fonts_urls.items():
        dst = os.path.join(fonts_dir, filename)
        if not os.path.exists(dst):
            try:
                print(f"[Fonts] Downloading {filename} from CDN...")
                urllib.request.urlretrieve(url, dst)
            except Exception as e:
                print(f"[Fonts] Could not download font {filename}: {e}")

def interpolate_color(stops, position):
    if not stops:
        return "#ffffff"
    
    stops = sorted(stops, key=lambda x: x.get('position', 0))
    position = max(0, min(100, position))
    
    left_stop = stops[0]
    right_stop = stops[-1]
    
    for s in stops:
        pos = s.get('position', 0)
        if pos <= position:
            left_stop = s
        if pos >= position:
            right_stop = s
            break
            
    l_pos = left_stop.get('position', 0)
    r_pos = right_stop.get('position', 0)
    
    l_color = left_stop.get('color', '#ffffff').strip().lstrip('#')
    r_color = right_stop.get('color', '#ffffff').strip().lstrip('#')
    
    if len(l_color) == 3:
        l_color = "".join([c*2 for c in l_color])
    if len(r_color) == 3:
        r_color = "".join([c*2 for c in r_color])
        
    try:
        lr, lg, lb = int(l_color[0:2], 16), int(l_color[2:4], 16), int(l_color[4:6], 16)
        rr, rg, rb = int(r_color[0:2], 16), int(r_color[2:4], 16), int(r_color[4:6], 16)
    except Exception:
        return "#ffffff"
        
    if r_pos == l_pos:
        factor = 0.0
    else:
        factor = (position - l_pos) / (r_pos - l_pos)
        
    r = int(lr + (rr - lr) * factor)
    g = int(lg + (rg - lg) * factor)
    b = int(lb + (rb - lb) * factor)
    
    return f"#{r:02x}{g:02x}{b:02x}"

def format_word_text(word_text, is_active, is_emp, is_spot, config, font_family, font_size_px, scale, text_color, stroke_enabled, stroke_width, shadow_enabled, shadow_x, shadow_y, shadow_blur):
    style_tags = []
    
    if font_family == 'Inter':
        font_family = 'Arial'

    if stroke_enabled:
        style_tags.append(f"\\bord{stroke_width}")
    else:
        style_tags.append("\\bord0")
        
    if shadow_enabled:
        style_tags.append(f"\\xshad{shadow_x * scale}\\yshad{shadow_y * scale}\\blur{shadow_blur * scale}")
    else:
        style_tags.append("\\xshad0\\yshad0\\blur0")

    w_font = font_family
    w_size = font_size_px
    w_color = text_color
    w_mode = config.get('colorToggle', 'Solid')
    w_stops = config.get('gradientStops', [])
    w_glow = ""

    base_bold = 1 if 'bold' in config.get('fontFace', '').lower() else 0
    base_italic = 1 if 'italic' in config.get('fontFace', '').lower() else 0

    if is_emp or is_spot:
        prefix = 'emphasis' if is_emp else 'spotlight'
        w_font = config.get(f'{prefix}Font', font_family)
        if w_font == 'Inter':
            w_font = 'Arial'
            
        w_size = font_size_px * config.get(f'{prefix}Size', 1.2)
        w_color = config.get(f'{prefix}Color', '#ff7800')
        w_mode = config.get(f'{prefix}Mode', 'Solid')
        w_stops = config.get(f'{prefix}GradientStops', [])
        w_glow = config.get(f'{prefix}Glow', '')
        
        w_face = config.get(f'{prefix}FontFace', '').lower()
        
        # Determine bold weight: if explicitly thin/regular/medium, set to 0. If bold, set to 1. Else inherit base_bold.
        if any(k in w_face for k in ('bold', 'black', 'semi bold', 'extra bold')):
            w_bold = 1
        elif any(k in w_face for k in ('regular', 'medium', 'light', 'thin', 'extra light')):
            w_bold = 0
        else:
            w_bold = base_bold
            
        w_italic = 1 if 'italic' in w_face else base_italic
        style_tags.append(f"\\b{w_bold}\\i{w_italic}")
            
        if w_glow:
            style_tags.append(f"\\3c{hex_to_ass_color(w_glow)}")
    elif is_active:
        w_color = '#ff7800'
        w_mode = 'Solid'
        style_tags.append(f"\\b{base_bold}\\i{base_italic}")
    else:
        style_tags.append(f"\\b{base_bold}\\i{base_italic}")

    style_tags.append(f"\\fn{w_font}\\fs{int(w_size)}")
    
    # Configure letter spacing
    letter_spacing = config.get('letterSpacing', 0)
    if letter_spacing != 0:
        style_tags.append(f"\\fsp{int(letter_spacing * scale)}")
        
    # Configure active transitions
    active_transition = config.get('activeTransition', 'none')
    transition_target = config.get('transitionTarget', 'WORD')
    if is_active and transition_target == 'WORD':
        if active_transition in ('pop', 'zoom'):
            style_tags.append("\\fscx100\\fscy100\\t(0,100,\\fscx115\\fscy115)\\t(100,200,\\fscx100\\fscy100)")
        elif active_transition == 'scale':
            style_tags.append("\\fscx0\\fscy0\\t(0,150,\\fscx100\\fscy100)")

    base_tag_str = "".join(style_tags)

    if w_mode == 'Gradient' and w_stops:
        char_parts = []
        N = len(word_text)
        for j, char in enumerate(word_text):
            pos = (j / max(1, N - 1)) * 100 if N > 1 else 0
            char_color_hex = interpolate_color(w_stops, pos)
            ass_color = hex_to_ass_color(char_color_hex)
            char_parts.append(f"{{\\c{ass_color}}}{char}")
        joined_chars = "".join(char_parts)
        return f"{{{base_tag_str}}}{joined_chars}"
    else:
        ass_color = hex_to_ass_color(w_color)
        return f"{{{base_tag_str}\\c{ass_color}}}{word_text}"

class ExportRenderService:
    @staticmethod
    def wrap_lines_pillow(words, font_family, font_size_px, max_width_px, casing, lines_mode='1 Line', config=None):
        if config is None:
            config = {}
            
        num_lines = int(lines_mode.split(' ')[0]) if lines_mode else 1
        
        # 1. Format word texts
        for w in words:
            text_val = w.get('text', w.get('word', ''))
            if casing == 'uppercase':
                text_val = text_val.upper()
            elif casing == 'lowercase':
                text_val = text_val.lower()
            elif casing == 'capitalize':
                text_val = text_val.capitalize()
            w['rendered_text'] = text_val

        # If linesMode is 2 Lines or more, use mathematical split
        if num_lines > 1:
            words_per_line = (len(words) + num_lines - 1) // num_lines
            lines = []
            current_line = []
            for idx, w in enumerate(words):
                if idx > 0 and idx % words_per_line == 0:
                    lines.append(current_line)
                    current_line = []
                current_line.append(w)
            if current_line:
                lines.append(current_line)
            return lines

        # Otherwise (1 Line), use pixel-width wrapping using Pillow
        font_cache = {}
        def get_word_width(w):
            w_font = font_family
            w_size = font_size_px
            is_emp = w.get('emphasis', False) and not config.get('removeEmphasis', False)
            is_spot = w.get('spotlight', False) and not config.get('removeEmphasis', False)
            
            if is_emp or is_spot:
                prefix = 'emphasis' if is_emp else 'spotlight'
                w_font = config.get(f'{prefix}Font', font_family)
                if w_font == 'Inter':
                    w_font = 'Arial'
                w_size = font_size_px * config.get(f'{prefix}Size', 1.2)
                
            w_size_key = int(w_size)
            cache_key = (w_font, w_size_key)
            
            if cache_key not in font_cache:
                font = None
                try:
                    if platform.system() == 'Windows':
                        win_fonts_dir = os.path.join(os.environ.get('WINDIR', 'C:\\Windows'), 'Fonts')
                        font_file = 'arial.ttf'
                        if w_font.lower() == 'georgia':
                            font_file = 'georgia.ttf'
                        elif w_font.lower() == 'times new roman':
                            font_file = 'times.ttf'
                        font_path = os.path.join(win_fonts_dir, font_file)
                        if os.path.exists(font_path):
                            font = ImageFont.truetype(font_path, w_size_key)
                except Exception:
                    pass
                if not font:
                    try:
                        font = ImageFont.load_default()
                    except Exception:
                        pass
                font_cache[cache_key] = font
                
            font = font_cache[cache_key]
            text = w['rendered_text']
            
            if not font:
                return len(text) * (w_size * 0.6)
            try:
                if hasattr(font, 'getbbox'):
                    bbox = font.getbbox(text)
                    return bbox[2] - bbox[0]
                else:
                    return font.getsize(text)[0]
            except Exception:
                return len(text) * (w_size * 0.6)

        # Get space width
        space_width = font_size_px * 0.25
        
        lines = []
        current_line = []
        current_line_width = 0
        
        # Apply 1.08 tolerance factor (8% buffer) to account for browser text compression differences
        tolerance_multiplier = 1.08
        
        for w in words:
            word_width = get_word_width(w)
            if len(current_line) > 0 and current_line_width + space_width + word_width > max_width_px * tolerance_multiplier:
                lines.append(current_line)
                current_line = []
                current_line_width = 0
                
            current_line.append(w)
            current_line_width += (0 if len(current_line) == 1 else space_width) + word_width
            
        if current_line:
            lines.append(current_line)
            
        return lines

    @classmethod
    def generate_ass_file(cls, captions, config, scale, ass_filepath, video_w=1080, video_h=1920):
        font_family = config.get('fontFamily', 'Inter')
        if font_family == 'Inter':
            font_family = 'Arial'
            
        font_size_px = config.get('fontSize', 24) * scale
        text_color = hex_to_ass_color(config.get('color', '#ffffff'), "&H00FFFFFF&")
        
        stroke_enabled = config.get('strokeEnabled', True)
        stroke_color = hex_to_ass_color(config.get('strokeColor', '#000000'), "&H00000000&")
        stroke_width = config.get('strokeWidth', 2) * scale if stroke_enabled else 0
        
        shadow_enabled = config.get('shadowEnabled', False)
        shadow_color = hex_to_ass_color(config.get('shadowColor', '#000000'), "&H63000000&")
        shadow_x = config.get('shadowX', 2)
        shadow_y = config.get('shadowY', 2)
        shadow_blur = config.get('shadowBlur', 4)
        
        bold = 1 if 'bold' in config.get('fontFace', '').lower() else 0
        italic = 1 if 'italic' in config.get('fontFace', '').lower() else 0
        
        casing = config.get('casing', 'normal')
        position_y_pct = config.get('position', {}).get('y', 70)
        box_width_pct = config.get('boxWidth', 80)
        
        text_align = config.get('textAlign', 'center')
        alignment = 5
        if text_align == 'left':
            alignment = 4
        elif text_align == 'right':
            alignment = 6
            
        bg_enabled = config.get('bgEnabled', False)
        border_style = 3 if bg_enabled else 1
        
        if bg_enabled:
            bg_opacity = config.get('bgOpacity', 100) / 100.0
            bg_color_hex = config.get('bgColor', '#000000')
            back_color = hex_to_ass_color(bg_color_hex)
            trans = int((1.0 - bg_opacity) * 255)
            if back_color.startswith("&H") and len(back_color) >= 10:
                back_color = f"&H{trans:02X}{back_color[4:]}"
        else:
            back_color = shadow_color

        width, height = video_w, video_h
        max_width_px = width * (box_width_pct / 100) - 24 * scale

        base_bold = bold
        base_italic = italic

        with open(ass_filepath, 'w', encoding='utf-8') as f:
            f.write("[Script Info]\n")
            f.write("ScriptType: v4.00+\n")
            f.write(f"PlayResX: {width}\n")
            f.write(f"PlayResY: {height}\n")
            f.write("WrapStyle: 0\n\n")
            
            f.write("[V4+ Styles]\n")
            f.write("Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
            f.write(f"Style: Default,{font_family},{font_size_px},{text_color},&H000000FF,{stroke_color},{back_color},{bold},{italic},0,0,100,100,0,0,{border_style},0,0,{alignment},0,0,0,1\n\n")
            
            f.write("[Events]\n")
            f.write("Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
            
            for cap in captions:
                words = cap.get('words', [])
                if not words:
                    words = [{'text': w, 'start': cap['start'], 'end': cap['end']} for w in cap['text'].split(' ')]
                
                intervals = []
                for w in words:
                    intervals.append(w['start'])
                    intervals.append(w['end'])
                intervals = sorted(list(set(intervals)))
                
                for i in range(len(intervals) - 1):
                    t1, t2 = intervals[i], intervals[i+1]
                    if t2 - t1 < 0.01:
                        continue
                        
                    active_word_index = -1
                    for idx, w in enumerate(words):
                        if t1 >= w['start'] and t2 <= w['end']:
                            active_word_index = idx
                            break
                            
                    lines = cls.wrap_lines_pillow(words, font_family, font_size_px, max_width_px, casing, config.get('linesMode', '1 Line'), config)
                    start_time = format_ass_time(t1)
                    end_time = format_ass_time(t2)
                    
                    pos_x = int(width * 0.5)
                    if text_align == 'left':
                        pos_x = int(width * (100 - box_width_pct) / 200)
                    elif text_align == 'right':
                        pos_x = int(width * (100 + box_width_pct) / 200)
                        
                    pos_y = int(height * (position_y_pct / 100))

                    # 1. SHADOW LAYER
                    shadow_parts = []
                    for line_words in lines:
                        line_parts = []
                        for idx, w in enumerate(words):
                            if w not in line_words:
                                continue
                            word_text = w['rendered_text']
                            is_active = (idx == active_word_index)
                            is_emp = w.get('emphasis', False) and not config.get('removeEmphasis', False)
                            is_spot = w.get('spotlight', False) and not config.get('removeEmphasis', False)

                            w_glow = ""
                            sh_font = font_family
                            sh_size = font_size_px
                            sh_bold = base_bold
                            sh_italic = base_italic
                            
                            if is_emp or is_spot:
                                prefix = 'emphasis' if is_emp else 'spotlight'
                                w_glow = config.get(f'{prefix}Glow', '')
                                sh_font = config.get(f'{prefix}Font', font_family)
                                if sh_font == 'Inter':
                                    sh_font = 'Arial'
                                    
                                sh_face = config.get(f'{prefix}FontFace', '').lower()
                                sh_size = font_size_px * config.get(f'{prefix}Size', 1.2)
                                
                                if any(k in sh_face for k in ('bold', 'black', 'semi bold', 'extra bold')):
                                    sh_bold = 1
                                elif any(k in sh_face for k in ('regular', 'medium', 'light', 'thin', 'extra light')):
                                    sh_bold = 0
                                else:
                                    sh_bold = base_bold
                                    
                                sh_italic = 1 if 'italic' in sh_face else base_italic

                            if w_glow:
                                sh_color = hex_to_ass_color(w_glow)
                                sh_blur = 10
                            elif shadow_enabled:
                                sh_color = shadow_color
                                sh_blur = shadow_blur
                            else:
                                sh_color = hex_to_ass_color('rgba(0, 0, 0, 0.95)')
                                sh_blur = 4

                            sh_tags = [f"\\bord0\\xshad0\\yshad0\\blur{int(sh_blur * scale)}"]
                            sh_tags.append(f"\\b{sh_bold}\\i{sh_italic}")
                            
                            letter_spacing = config.get('letterSpacing', 0)
                            if letter_spacing != 0:
                                sh_tags.append(f"\\fsp{int(letter_spacing * scale)}")
                                
                            sh_tags.append(f"\\fn{sh_font}\\fs{int(sh_size)}\\c{sh_color}")
                            
                            shadow_tag = "".join(sh_tags)
                            line_parts.append(f"{{{shadow_tag}}}{word_text}")
                        shadow_parts.append(" ".join(line_parts))
                    
                    shadow_content = "\\N".join(shadow_parts)
                    line_sh_x = shadow_x if shadow_enabled else 0
                    line_sh_y = shadow_y if shadow_enabled else 2
                    
                    sh_x = pos_x + int(line_sh_x * scale)
                    sh_y = pos_y + int(line_sh_y * scale)
                    
                    line_trans = config.get('activeTransition', 'none')
                    line_target = config.get('transitionTarget', 'WORD')
                    sh_fade_tag = ""
                    if line_trans == 'fade' and line_target == 'LINE':
                        sh_fade_tag = "{\\fad(150,150)}"
                        
                    f.write(f"Dialogue: 0,{start_time},{end_time},Default,,0,0,0,,{sh_fade_tag}{{\\pos({sh_x},{sh_y})}}{shadow_content}\n")

                    # 2. MAIN CRISP TEXT LAYER
                    dialogue_parts = []
                    for line_words in lines:
                        line_parts = []
                        for idx, w in enumerate(words):
                            if w not in line_words:
                                continue
                            
                            is_active = (idx == active_word_index)
                            is_emp = w.get('emphasis', False) and not config.get('removeEmphasis', False)
                            is_spot = w.get('spotlight', False) and not config.get('removeEmphasis', False)
                            
                            word_text = w['rendered_text']
                            styled_word = format_word_text(
                                word_text, is_active, is_emp, is_spot, config, 
                                font_family, font_size_px, scale, text_color, 
                                stroke_enabled, stroke_width, False, 
                                0, 0, 0
                            )
                            line_parts.append(styled_word)
                                
                        dialogue_parts.append(" ".join(line_parts))
                        
                    text_content = "\\N".join(dialogue_parts)
                    
                    text_fade_tag = ""
                    if line_trans == 'fade' and line_target == 'LINE':
                        text_fade_tag = "{\\fad(150,150)}"
                        
                    f.write(f"Dialogue: 1,{start_time},{end_time},Default,,0,0,0,,{text_fade_tag}{{\\pos({pos_x},{pos_y})}}{text_content}\n")

    @classmethod
    def execute_ffmpeg_render(cls, input_video, ass_filepath, output_video, resolution, width, height):
        # We use CRF (Constant Rate Factor) for encoding high-quality video.
        # CRF 18 is visually lossless and guarantees pristine quality without pixelation.
        crf = '18'
        if resolution == '1440':
            crf = '16'
        elif resolution == '2160':
            crf = '14'
            
        # Prepare local fonts directory
        fonts_dir = os.path.join(os.path.dirname(os.path.dirname(ass_filepath)), "fonts")
        prepare_fonts_directory(fonts_dir)
        
        os.makedirs(os.path.dirname(output_video), exist_ok=True)
        safe_ass_path = ass_filepath.replace('\\', '/').replace(':', '\\:')
        safe_fonts_dir = fonts_dir.replace('\\', '/').replace(':', '\\:')
        
        cmd = [
            'ffmpeg', '-y',
            '-i', input_video,
            '-vf', f"scale={width}:{height},subtitles='{safe_ass_path}':fontsdir='{safe_fonts_dir}'",
            '-c:v', 'libx264',
            '-crf', crf,
            '-preset', 'fast',
            '-pix_fmt', 'yuv420p',
            '-c:a', 'aac',
            '-b:a', '192k',
            output_video
        ]
        
        print(f"[ExportRender] Launching FFmpeg command: {' '.join(cmd)}")
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if result.returncode != 0:
            err_msg = result.stderr.decode('utf-8', errors='ignore')
            print(f"[ExportRender] FFmpeg failed with error:\n{err_msg}")
            raise Exception(f"FFmpeg error: {err_msg}")
        print(f"[ExportRender] Render completed successfully: {output_video}")
