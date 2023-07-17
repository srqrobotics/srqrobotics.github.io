import os
import reference

news_dir = './news/'

def get_news(_dir):
    dir_list = os.listdir(_dir)
    news_list = []
    for dir_name in dir_list:
        if not(os.path.isfile(_dir + dir_name)):
            # print(dir_name)
            news_list.append(dir_name)

    news_list.sort(reverse=True)
    news_list.remove('__pycache__')
    return news_list

def get_title(_dir, _news):
    titles = []
    file_list = os.listdir(_dir + _news)

    for file in file_list:
        if file.endswith('.html'):
            titles.append(file.split('.')[0])

    return titles


def create_block(dates, latest_news):
    with open('news.html', 'w') as file:
        header, body, end = reference.get_header(latest_news)

        file.write(header)
        file.write(body)
        file.write('<ul>\n')
        
        for date in dates:
            file.write('\t<li>\n') 

            title = get_title(news_dir, date)
            for news in title:
                file.write('\t\t')
                file.write(f"<img src='news/{date}/thumbnail.jpg' alt='News Details'>\n")
            
                file.write('\t\t')
                file.write("<div class='post-inner'>\n")
                
                file.write('\t\t\t')
                file.write(f"<span>{date}</span>\n")
                
                html_file = f"news/{date}/{news}.html"
                file.write('\t\t\t')
                file.write(f"""<a href='#news-feed' onclick="change_iframe('{html_file}')">\n""")
            
                file.write('\t\t\t\t')
                file.write(f"{news}\n")
            
                file.write('\t\t\t')
                file.write("</a>\n")
            
                file.write('\t\t')
                file.write("</div>\n")

            file.write('\t</li>\n')

        file.write('</ul>\n')
        file.write(end)


if __name__ == '__main__':
    news_list = get_news(news_dir)

    latest_title = get_title(news_dir, news_list[0])
    latest_news = news_dir + news_list[0] + '/' + latest_title[0] + '.html'

    print(latest_news)
    
    create_block(news_list, latest_news)



    


