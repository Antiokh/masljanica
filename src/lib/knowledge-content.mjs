// Public editorial sources, not private CRM or invented festival history.
export const sources=[
 {id:'dubrovsky-1870',name:'Масляница',author:'Н. Дубровский',year:1870,publication:'Москва, типография С. Селивановского',url:'https://rodnovery.ru/images/knigi/dubrovskij-maslyanitsa.pdf',type:'Book'},
 {id:'bozheryanov-1894',name:'Как праздновал и празднует народ русский Рождество Христово, Новый год, Крещение и Масляницу',author:'И. Н. Божерянов',year:1894,publication:'Издание М. Ледерле и Ко',type:'Book'},
 {id:'pancakes-1854',name:'Лучшие московские блины, или Практические наставления, как печь блины и оладьи',year:1854,publication:'Москва, типография Александра Семена',type:'Book'},
 {id:'dal',name:'Толковый словарь живого великорусского языка — статья «Масло»',author:'В. И. Даль',url:'https://ru.wikisource.org/wiki/ТСД2/Масло',type:'Book'},
 {id:'ushakov',name:'Толковый словарь русского языка — «Масленица»',author:'Д. Н. Ушаков (ред.)',url:'https://lexicography.online/explanatory/ushakov/%D0%BC/%D0%BC%D0%B0%D1%81%D0%BB%D0%B5%D0%BD%D0%B8%D1%86%D0%B0',type:'Book'},
 {id:'culture',name:'Русская Масленица: саундтрек',url:'https://www.culture.ru/materials/93934/russkaya-maslenica-saundtrek'},
 {id:'kirchuk',name:'Работа Т. Кирчук о народной традиции',url:'http://troitsa.net/kirchuk/book1.htm'},
 {id:'name-study',name:'Исследовательская работа о названии Масленицы',url:'https://nsportal.ru/ap/library/drugoe/2013/03/12/issledovatelskaya-rabota-pochemu-maslenitsa-nazyvaetsya-maslenitsoy'},
 {id:'prlib',name:'Материалы Президентской библиотеки',url:'https://www.prlib.ru/news/2024092'},
 {id:'bigenc',name:'Библиографическая справка о «Маслянице»',url:'https://bigenc.ru/b/maslianitsa-abfd6f'}
];
const l=(title,href)=>'['+title+']('+href+')';
export const sourceText=sources.map(s=>'## '+s.name+'\n\n'+[s.author,s.year,s.publication,s.url?l('Открыть источник',s.url):''].filter(Boolean).join(' · ')).join('\n\n')+'\n\nАтрибуция фотографий и записей приведена в [истории](/history/), источники частушек — в [соответствующем разделе](/ditties/). Доступность материалов не означает единую открытую лицензию.';
// Translated bibliographic descriptions; the Russian source records remain canonical.
const sourceTranslations={
  "dubrovsky-1870": {
    "en": [
      "Maslyanitsa",
      "N. Dubrovsky",
      "Moscow, S. Selivanovsky Printing House"
    ],
    "sr": [
      "Masljanica",
      "N. Dubrovski",
      "Moskva, štamparija S. Selivanovskog"
    ]
  },
  "bozheryanov-1894": {
    "en": [
      "How the Russian People Celebrated and Celebrate Christmas, New Year, Epiphany and Maslyanitsa",
      "I. N. Bozheryanov",
      "Published by M. Lederle & Co."
    ],
    "sr": [
      "Kako je ruski narod proslavljao i proslavlja Božić, Novu godinu, Bogojavljenje i Masljanicu",
      "I. N. Božerjanov",
      "Izdanje M. Lederlea i Ko."
    ]
  },
  "pancakes-1854": {
    "en": [
      "The Best Moscow Pancakes, or Practical Instructions for Making Blini and Oladyi",
      "",
      "Moscow, Alexander Semyon Printing House"
    ],
    "sr": [
      "Najbolje moskovske palačinke, ili praktična uputstva za pripremu blina i oladija",
      "",
      "Moskva, štamparija Aleksandra Semjona"
    ]
  },
  "dal": {
    "en": [
      "Explanatory Dictionary of the Living Great Russian Language — entry “Butter”",
      "V. I. Dahl"
    ],
    "sr": [
      "Tumačni rečnik živog velikoruskog jezika — odrednica „Maslo”",
      "V. I. Dalj"
    ]
  },
  "ushakov": {
    "en": [
      "Explanatory Dictionary of the Russian Language — “Maslenitsa”",
      "D. N. Ushakov (ed.)"
    ],
    "sr": [
      "Tumačni rečnik ruskog jezika — „Maslenica”",
      "D. N. Ušakov (ur.)"
    ]
  },
  "culture": {
    "en": [
      "Russian Maslenitsa: The Soundtrack"
    ],
    "sr": [
      "Ruska Maslenica: muzika praznika"
    ]
  },
  "kirchuk": {
    "en": [
      "T. Kirchuk's work on folk tradition"
    ],
    "sr": [
      "Rad T. Kirčuk o narodnoj tradiciji"
    ]
  },
  "name-study": {
    "en": [
      "Research paper on the origin of the name Maslenitsa"
    ],
    "sr": [
      "Istraživački rad o poreklu naziva Maslenica"
    ]
  },
  "prlib": {
    "en": [
      "Presidential Library materials"
    ],
    "sr": [
      "Materijali Predsedničke biblioteke"
    ]
  },
  "bigenc": {
    "en": [
      "Bibliographic entry on Maslyanitsa"
    ],
    "sr": [
      "Bibliografska odrednica o Masljanici"
    ]
  }
};
export function localizedSources(locale='ru'){
 if(locale==='ru')return sources;
 return sources.map(source=>{
  const copy=sourceTranslations[source.id]?.[locale];
  if(!copy)throw Error('Missing source translation: '+source.id+' '+locale);
  const [name,author,publication]=copy;
  return {...source,name,author:author||undefined,publication:publication||undefined,originalName:source.name};
 });
}
const sourceCopy={
 en:{open:'Open source',original:'Original title',description:'Historical bibliography of Maslenitsa: Dubrovsky, Bozheryanov, Dahl, Ushakov and historical recipes.',seo:'Sources on the history of Maslenitsa — books and dictionaries',note:'Photographs and recordings are credited in the [history section](/en/history/); sources of chastushki are listed in the [corresponding section](/en/ditties/). Availability of these materials does not imply a common open licence.'},
 sr:{open:'Otvori izvor',original:'Izvorni naslov',description:'Istorijska bibliografija Maslenice: Dubrovski, Božerjanov, Dalj, Ušakov i stari recepti.',seo:'Izvori o istoriji Maslenice — knjige i rečnici',note:'Podaci o autorstvu fotografija i snimaka navedeni su u [istoriji](/sr/history/), a izvori častuški u [odgovarajućem odeljku](/sr/ditties/). Dostupnost materijala ne znači da svi imaju istu otvorenu licencu.'}
};
export function localizedSourcePage(locale){
 const copy=sourceCopy[locale];
 if(!copy)throw Error('Unsupported source page locale: '+locale);
 const body=localizedSources(locale).map(s=>'## '+s.name+'\n\n'+[s.author,s.year,s.publication,s.url?l(copy.open,s.url):''].filter(Boolean).join(' · ')+(s.type==='Book'?'\n\n'+copy.original+': *'+s.originalName+'*':'')).join('\n\n')+'\n\n'+copy.note;
 return {body,description:copy.description,seoTitle:copy.seo};
}
export const terms=[
 ['Масленица','Традиционный праздник проводов зимы и встречи весны; современное общеупотребительное написание. Название нашего фестиваля — Масляница.','/history/name/'],
 ['Сырная неделя','Неделя перед Великим постом, завершающаяся Прощёным воскресеньем.','/history/week/'],
 ['Прощёное воскресенье','Последний день Сырной недели, связанный с обычаем просить прощения.','/history/farewell/'],
 ['Скоморох','В народной культуре — исполнитель, музыкант и устроитель потех; в нашем сказе ведёт действие и общается со зрителями.','/scenario/'],
 ['Закличка','Короткая обрядовая песня или обращение, в том числе призыв весны.','/songs/'],
 ['Хоровод','Коллективное действие с движением, часто по кругу, сопровождаемое пением или игрой.','/games/'],
 ['Ряженые','Участники гуляний в изменённом облике или костюмах.','/history/songs/'],
 ['Частушка','Короткая рифмованная песенная форма; на сайте представлены авторские и фольклорные тексты.','/ditties/']
];
export const glossaryText=terms.map(([name,definition,href])=>'## '+name+'\n\n'+definition+' '+l('Подробнее',href)).join('\n\n');
export function questions({upcoming,date,time,location,mapUrl}){
 return [
 ['Когда проходит Масляница в Белграде?',upcoming?'Ближайший фестиваль: '+date+(time?', '+time:'')+'. Время местное.':'Дата следующего фестиваля пока не объявлена.'],
 ['Где проходит фестиваль?',upcoming?'Место проведения: '+location+'. '+l('Карта площадки',mapUrl):'Актуальное место будет объявлено вместе с датой на [главной странице](/).'],
 ['Сколько стоит вход?',upcoming?'Вход свободный. Праздник проводится на волонтёрских началах; приветствуется добровольный донейшн на блины.':'Условия следующего фестиваля будут опубликованы вместе с программой.'],
 ['Что будет на празднике?','Театрализованный сказ, песни, игры, блины, народные мастерские. Актуальные время и состав мероприятий смотрите в [программе](/).'],
 ['Можно ли прийти с детьми?','Да, в каталоге есть игры и мастерские для разных возрастов. Возраст и аудитория указаны у конкретных [игр](/games/) и [мастер-классов](/workshops/).'],
 ['Почему Масляница пишется через «я»?','Это исторический вариант названия, встречающийся в словарях и книге Н. Дубровского 1870 года. [Подробнее](/history/name/).'],
 ['Как присоединиться к команде Масляницы?','Приглашаем волонтёров, артистов, музыкантов, мастеров и всех, кто хочет помочь в подготовке праздника. [Как принять участие](/#join).'],
 ['Можно ли читать материалы вне праздника?','Да. [Песни](/songs/), [игры](/games/), [рецепты](/pancakes/), [история](/history/) и [сказ](/scenario/) доступны независимо от даты. Приложение поддерживает подготовку офлайн-копии.']
 ];
}
export const participation={
 title:'Стать частью Масляницы',
 intro:'Масляницу мы делаем вместе, на волонтёрских началах. Хотите не только прийти на праздник, но и помочь его создать? Присоединяйтесь к нашей команде!',
 roles:[
  ['Артисты и музыканты','Играть персонажей сказа, петь, выступать и помогать с музыкальным сопровождением.'],
  ['Мастера и ведущие','Проводить мастер-классы, народные игры, хороводы и конкурсы.'],
  ['Волонтёры','Помогать с подготовкой площадки, реквизитом, встречей гостей и уборкой после праздника.'],
  ['Угощение','Испечь и принести блины, помочь с угощением гостей.'],
  ['Фото, видео и продвижение','Снимать праздник, рассказывать о нём и делиться материалами.']
 ],
 outro:'Есть своя идея или просто желание помочь? Расскажите о себе и о том, чем хотели бы заняться. Напишите Антону в Telegram.',
 contact:{url:'https://t.me/antiokh',handle:'@antiokh',label:'Написать в Telegram'}
};
export const participationText=()=>['## '+participation.title,participation.intro,...participation.roles.map(([title,description])=>'- **'+title+'** — '+description),participation.outro,l(participation.contact.label,participation.contact.url)].join('\n\n');
export const faqText=rows=>rows.map(([q,a])=>'## '+q+'\n\n'+a).join('\n\n');

// Locale-aware answers share the same event configuration and URLs.
export function localizedQuestions(args,locale='ru'){
 if(locale==='ru')return questions(args);
 const {upcoming,date,time,location,mapUrl}=args;
 const when=[date,time].filter(Boolean).join(', ');
 const path=p=>'/'+locale+p;
 const link=(label,p)=>'['+label+']('+path(p)+')';
 if(locale==='sr')return [
 ['Kada se održava Masljanica u Beogradu?',upcoming?'Sledeći festival: '+when+'. Vreme je lokalno.':'Datum sledećeg festivala još nije objavljen.'],
 ['Gde se održava festival?',upcoming?'Mesto: '+location+'. [Mapa mesta]('+mapUrl+')':'Mesto će biti objavljeno sa datumom na '+link('početnoj stranici','/')+'.'],
 ['Koliko košta ulaz?',upcoming?'Ulaz je slobodan. Festival se organizuje volonterski; dobrovoljni prilog za palačinke je dobrodošao.':'Uslovi sledećeg festivala biće objavljeni uz program.'],
 ['Šta će biti na festivalu?','Pozorišna bajka, pesme, igre, palačinke i narodne radionice. Aktuelno vreme i sadržaj pogledajte u '+link('programu','/')+'.'],
 ['Mogu li doći sa decom?','Da. U katalogu su igre i radionice za različite uzraste. Uzrast i učesnici navedeni su kod pojedinačnih '+link('igara','/games/')+' i '+link('radionica','/workshops/')+'.'],
 ['Zašto se piše Masljanica?','Istorijski oblik naziva iz rečnika i knjige N. Dubrovskog iz 1870. '+link('Više','/history/name/')+'.'],
 ['Kako da se pridružim timu Masljanice?','Pozivamo volontere, izvođače, muzičare, majstore i sve koji žele da pomognu u pripremi festivala. '+link('Kako učestvovati','/#join')+'.'],
 ['Mogu li koristiti materijale van festivala?','Da. '+link('Pesme','/songs/')+', '+link('igre','/games/')+', '+link('recepti','/pancakes/')+', '+link('istorija','/history/')+' i '+link('bajka','/scenario/')+' dostupni su bez obzira na datum. Aplikacija podržava oflajn kopiju.']
 ];
 return [
 ['When is Masljanica in Belgrade?',upcoming?'Next festival: '+when+'. Local time.':'The next festival date has not been announced.'],
 ['Where is the festival?',upcoming?'Venue: '+location+'. [Venue map]('+mapUrl+')':'The venue will be announced with the date on the '+link('homepage','/')+'.'],
 ['How much is admission?',upcoming?'Admission is free. The festival is volunteer-run; voluntary contributions for pancakes are welcome.':'Admission arrangements for the next festival will be published with the programme.'],
 ['What happens at the festival?','A theatrical tale, songs, games, pancakes and folk workshops. Check the '+link('programme','/')+' for current times and activities.'],
 ['Can I bring children?','Yes. The catalogue includes games and workshops for different ages. Ages and audiences are specified for individual '+link('games','/games/')+' and '+link('workshops','/workshops/')+'.'],
 ['Why is it spelled Masljanica?','It is a historical spelling recorded in dictionaries and N. Dubrovsky’s 1870 book. '+link('Read more','/history/name/')+'.'],
 ['How can I join the Masljanica team?','We welcome volunteers, performers, musicians, artisans and anyone who wants to help prepare the festival. '+link('How to take part','/#join')+'.'],
 ['Can I use the materials outside the festival?','Yes. '+link('Songs','/songs/')+', '+link('games','/games/')+', '+link('recipes','/pancakes/')+', '+link('history','/history/')+' and the '+link('folk tale','/scenario/')+' are available year-round. The app supports a complete offline copy.']
 ];
}
