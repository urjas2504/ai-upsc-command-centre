import Parser from "rss-parser";

const parser = new Parser();

export async function fetchNews() {
  try {
    const feed = await parser.parseURL("https://www.thehindu.com/news/national/feeder/default.rss");

    const articles = feed.items.slice(0, 5).map(item => ({
      title: item.title,
      content: item.contentSnippet || item.content || "",
      link: item.link
    }));

    return articles;

  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}
