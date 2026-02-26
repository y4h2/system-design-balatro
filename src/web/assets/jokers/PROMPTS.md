# Joker Card Image Prompts

统一风格前缀：
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration,
```

生成命令格式：
```bash
python .claude/scripts/image-generator.py "<前缀 + 描述>" -o src/web/assets/jokers/<id>.png -s 512 -m gemini-3-pro-image-preview
```

生成后批量转 webp：
```bash
cd src/web/assets/jokers
for f in *.png; do cwebp -q 80 "$f" -o "${f%.png}.webp" && rm "$f"; done
```

---

## 1. jk_sla_maniac (SLA 狂魔)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Server room with rows of rack servers, green LED status lights glowing in darkness, cool blue ambient light, data center atmosphere
```

## 2. jk_data_hoarder (数据囤积者)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Macro close-up of a hard drive platter with read head, reflective surface showing rainbow light patterns, technical precision
```

## 3. jk_cloud_native (云原生信徒)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Aerial view of a colorful shipping container yard with stacked containers, Docker cloud metaphor, industrial scale
```

## 4. jk_pattern_amp (模式放大器)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Vintage guitar amplifier with glowing vacuum tubes, volume dial cranked to 11, warm orange light, rock and roll energy
```

## 5. jk_combo_king (连击之王)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Retro arcade cabinet glowing with neon purple and blue lights in a dark arcade room, pixel art on screen, nostalgic atmosphere
```

## 6. jk_card_counter (算牌大师)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Playing cards spread elegantly on a green felt poker table, dramatic lighting from above, casino atmosphere
```

## 7. jk_reroll_master (重抽大师)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Colorful dice mid-roll captured in motion, dynamic angles, multiple dice showing different faces, energetic composition
```

## 8. jk_gold_mine (掘金者)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Stacked gold bars and scattered gold nuggets with dramatic spotlight, treasure vault atmosphere, warm golden glow
```

## 9. jk_all_in (梭哈)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Poker chips pushed all-in on a green felt table, dramatic overhead lighting, stacks of red black and white chips, high stakes
```

## 10. jk_minimalist (极简主义)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Ultra-clean white minimalist modern architecture building, sharp geometric lines, blue sky, Bauhaus inspired design
```

## 11. jk_rubber_duck (橡皮鸭)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Bright yellow rubber duck sitting on a programmer desk next to a keyboard and monitor with code, debugging mascot, cute and fun
```

## 12. jk_legacy_code (遗留代码)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Vintage 1980s computer with green CRT monitor displaying code, retro computing setup, warm nostalgic lighting, floppy disks
```

## 13. jk_microservice_mania (微服务狂热)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Tangled mass of colorful network cables in a server room patch panel, organized chaos, tech infrastructure
```

## 14. jk_cache_hit (缓存命中)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Formula 1 racing car speeding with motion blur, speed lines, high velocity, red and white livery, dynamic angle
```

## 15. jk_incident_cmd (事故指挥官)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Red emergency alarm light spinning in a dark industrial corridor, warning atmosphere, dramatic red glow, alert signal
```

## 16. jk_open_source (开源贡献者)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Terminal screen showing green code on black background, hacker aesthetic, matrix style, programming atmosphere, bright text
```

## 17. jk_10x_dev (10x 工程师)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Space rocket launching with dramatic fire and smoke plume, clear blue sky, powerful thrust, ascending into space
```

## 18. jk_over_engineer (过度设计)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Complex Rube Goldberg contraption machine with gears pulleys and levers, steampunk influenced, intricate mechanisms, whimsical engineering
```

## 19. jk_devops_guru (DevOps 大师)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Industrial conveyor belt in a modern factory with robotic arms, CI CD pipeline metaphor, blue and orange lighting, automation
```

## 20. jk_chaos_lover (混沌爱好者)
```
Digital illustration, tech culture aesthetic, vibrant colors, portrait orientation 2:3 aspect ratio, no text no words no letters, detailed high quality, suitable as a game card illustration, Monarch butterfly with detailed wing patterns in macro, colorful wings against dark background, butterfly effect chaos theory
```
