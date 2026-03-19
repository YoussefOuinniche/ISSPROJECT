# Sources I used to get data from:
# https://www.bls.gov/ooh/computer-and-information-technology/home.htm
# https://www.hiringlab.org/fr/
# https://www.naceweb.org/job-market/trends-and-predictions

import requests
from bs4 import BeautifulSoup
import textwrap
import sys

# how long to wait for a website before giving up (in seconds)
REQUEST_TIMEOUT = 15

# the urls we are scraping from
BLS_URL = "https://www.bls.gov/ooh/computer-and-information-technology/home.htm"
HIRING_LAB_URL = "https://www.hiringlab.org/fr/"
NACE_URL = "https://www.naceweb.org/job-market/trends-and-predictions"


# --- HELPER: make a get request to a website ---
def make_request(url, params=None):
    # i looked up what headers to send so websites dont block us
    my_headers = {
        "User-Agent": "SkillPulse-Research-Bot/1.0 (academic project - IT career research)",
        "Accept": "text/html,application/json,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        response = requests.get(url, headers=my_headers, params=params, timeout=REQUEST_TIMEOUT)
        # raise_for_status throws an error if the website returned 404 or 500 etc
        response.raise_for_status()
        return response

    except requests.exceptions.Timeout:
        print("Warning: request timed out for url:", url)
        return None

    except requests.exceptions.HTTPError as error:
        print("Warning: HTTP error for url:", url, "error:", error)
        return None

    except requests.exceptions.ConnectionError as error:
        print("Error: could not connect to:", url, "error:", error)
        return None

    except Exception as error:
        print("Error: request failed for:", url, "error:", error)
        return None


# --- SCRAPE BLS (bureau of labor statistics) ---
def scrape_bls():
    print("Scraping BLS website...")

    response = make_request(BLS_URL)
    if response is None:
        print("Warning: BLS request failed, skipping.")
        return []

    # parse the html
    soup = BeautifulSoup(response.text, "html.parser")

    # find the table on the page
    table = soup.find("table")
    if table is None:
        print("Warning: could not find table on BLS page, maybe the site changed.")
        return []

    results = []

    # go through each row in the table
    rows = table.find_all("tr")

    # skip first row because it's the header
    i = 1
    while i < len(rows):
        row = rows[i]
        cells = row.find_all("td")

        # skip rows that don't have enough columns
        if len(cells) < 2:
            i = i + 1
            continue

        # get the job name from first cell
        first_cell = cells[0]
        job_name = first_cell.get_text(strip=True)

        # try to get the link
        link_tag = first_cell.find("a")
        job_link = ""
        if link_tag is not None:
            raw_link = link_tag.get("href", "")
            if raw_link.startswith("http"):
                job_link = raw_link
            else:
                job_link = "https://www.bls.gov" + raw_link

        # get the other columns if they exist
        education = "N/A"
        median_pay = "N/A"
        job_outlook = "N/A"

        if len(cells) > 1:
            education = cells[1].get_text(strip=True)
        if len(cells) > 2:
            median_pay = cells[2].get_text(strip=True)
        if len(cells) > 3:
            job_outlook = cells[3].get_text(strip=True)

        # build a text description
        body = "Occupation: " + job_name + ". "
        body = body + "Entry-level education required: " + education + ". "
        body = body + "Median annual pay: " + median_pay + ". "
        body = body + "10-year job outlook: " + job_outlook + "."

        # add to our results list
        result = {
            "title": "[BLS OOH] " + job_name,
            "href": job_link,
            "body": body
        }
        results.append(result)

        i = i + 1

    print("BLS: found", len(results), "occupation(s)")
    return results


# --- SCRAPE HIRING LAB ---
def scrape_hiring_lab(limit):
    print("Scraping Hiring Lab website...")

    response = make_request(HIRING_LAB_URL)
    if response is None:
        print("Warning: Hiring Lab request failed, skipping.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    results = []

    # try to find article tags first
    articles = soup.find_all("article")

    # if no articles found, try headings instead
    if len(articles) == 0:
        articles = soup.find_all(["h2", "h3"])

    count = 0
    for node in articles:
        # stop when we have enough results
        if count >= limit:
            break

        # get the link inside the article or heading
        link_tag = node.find("a")

        if link_tag is None:
            continue

        title = link_tag.get_text(strip=True)
        if title == "":
            continue

        # build the full url
        raw_link = link_tag.get("href", "")
        if raw_link == "":
            job_link = HIRING_LAB_URL
        elif raw_link.startswith("http"):
            job_link = raw_link
        else:
            job_link = "https://www.hiringlab.org" + raw_link

        # try to get a paragraph of text
        excerpt = ""
        if node.name == "article":
            para = node.find("p")
            if para is not None:
                excerpt = para.get_text(strip=True)

        # build body text
        if excerpt != "":
            body = title + ". " + excerpt
        else:
            body = title

        result = {
            "title": "[Hiring Lab] " + title,
            "href": job_link,
            "body": body
        }
        results.append(result)

        count = count + 1

    print("Hiring Lab: found", len(results), "article(s)")
    return results


# --- SCRAPE NACE WEB ---
def scrape_nace(limit):
    print("Scraping NACE website...")

    response = make_request(NACE_URL)
    if response is None:
        print("Warning: NACE request failed, skipping.")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    results = []

    # try article tags first
    nodes = soup.find_all("article")

    # try list items if no articles
    if len(nodes) == 0:
        all_li = soup.find_all("li")
        # filter to ones that look like article items (have "item" in class name)
        nodes = []
        for li in all_li:
            classes = li.get("class", [])
            for class_name in classes:
                if "item" in class_name.lower():
                    nodes.append(li)
                    break

    # last resort: just use headings
    if len(nodes) == 0:
        nodes = soup.find_all(["h2", "h3", "h4"])

    count = 0
    for node in nodes:
        if count >= limit:
            break

        # get the link
        link_tag = node.find("a")
        if link_tag is None:
            continue

        title = link_tag.get_text(strip=True)
        if title == "":
            continue

        # build full url
        raw_link = link_tag.get("href", "")
        if raw_link == "":
            job_link = NACE_URL
        elif raw_link.startswith("http"):
            job_link = raw_link
        else:
            job_link = "https://www.naceweb.org" + raw_link

        # try to get excerpt
        excerpt = ""
        para = node.find("p")
        if para is not None:
            excerpt = para.get_text(strip=True)

        # try to get a date (look for elements with "date" or "time" in class)
        date_text = ""
        all_elements = node.find_all(True)  # find all tags inside the node
        for element in all_elements:
            classes = element.get("class", [])
            for class_name in classes:
                if "date" in class_name.lower() or "time" in class_name.lower():
                    date_text = element.get_text(strip=True)
                    break

        # build body text
        body = title
        if date_text != "":
            body = body + " Published: " + date_text + "."
        if excerpt != "":
            body = body + " " + excerpt

        result = {
            "title": "[NACE] " + title,
            "href": job_link,
            "body": body
        }
        results.append(result)

        count = count + 1

    print("NACE: found", len(results), "article(s)")
    return results


# --- COMBINE ALL SOURCES ---
def scrape_it_jobs_data(query, per_source_limit):
    print("Gathering IT jobs data for query:", query)

    all_results = []

    # get bls data
    try:
        bls_results = scrape_bls()
        # only take up to the limit
        added = 0
        for item in bls_results:
            if added >= per_source_limit:
                break
            all_results.append(item)
            added = added + 1
    except Exception as error:
        print("Error in BLS scraper:", error)

    # get hiring lab data
    try:
        hl_results = scrape_hiring_lab(per_source_limit)
        for item in hl_results:
            all_results.append(item)
    except Exception as error:
        print("Error in Hiring Lab scraper:", error)

    # get nace data
    try:
        nace_results = scrape_nace(per_source_limit)
        for item in nace_results:
            all_results.append(item)
    except Exception as error:
        print("Error in NACE scraper:", error)

    print("Total results gathered:", len(all_results))
    return all_results


# --- CALL THE LLM WITH SCRAPED DATA ---
def answer_with_scraped_context(query, per_source_limit):
    # import our backend chat function
    from backend import call_llm

    # check query is not empty
    if query is None or query.strip() == "":
        return "Please provide a non-empty query."

    print("Starting scraper pipeline for query:", query)

    results = scrape_it_jobs_data(query, per_source_limit)

    if len(results) == 0:
        return "I could not retrieve IT job market data from any source right now. Please try again later."

    # build a numbered list of results to give to the llm
    context_parts = []
    number = 1
    for item in results:
        body = item.get("body", "")
        # shorten body so it doesnt get too long
        short_body = textwrap.shorten(body, width=300, placeholder="...")
        href = item.get("href", "")
        title = item.get("title", "Result " + str(number))

        context_line = "[" + str(number) + "] " + title + "\n"
        context_line = context_line + "URL: " + href + "\n"
        context_line = context_line + short_body

        context_parts.append(context_line)
        number = number + 1

    # join all context parts with blank lines between them
    context_text = ""
    for part in context_parts:
        if context_text != "":
            context_text = context_text + "\n\n"
        context_text = context_text + part

    # write the prompts
    system_prompt = (
        "You are SkillPulse AI, a helpful assistant for IT skills and career development. "
        "You have been given data scraped from three sources: "
        "the US Bureau of Labor Statistics, the Indeed Hiring Lab, and NACE Web. "
        "Answer the user's question using this data. "
        "Mention the source when it helps, and be honest if the data does not cover the question."
    )

    user_prompt = "Scraped IT job market context:\n\n"
    user_prompt = user_prompt + context_text + "\n\n"
    user_prompt = user_prompt + "Question: " + query + "\n\n"
    user_prompt = user_prompt + "Please give a clear and helpful answer based on the context above."

    print("Sending", len(results), "results to LLM for query:", query)

    answer = call_llm(system_prompt, user_prompt)
    return answer


# --- MAIN FUNCTION ---
def main(query, per_source_limit=5):
    return answer_with_scraped_context(query, per_source_limit)


# --- RUN FROM COMMAND LINE ---
if __name__ == "__main__":
    # get query from command line arguments if given
    if len(sys.argv) > 1:
        # join all arguments after the script name
        search_query = ""
        i = 1
        while i < len(sys.argv):
            if search_query != "":
                search_query = search_query + " "
            search_query = search_query + sys.argv[i]
            i = i + 1
    else:
        search_query = "Python developer"

    print("")
    print("Querying IT jobs pipeline for:", search_query)
    print("")

    result = main(search_query)

    print("")
    print("=" * 70)
    print("ANSWER")
    print("=" * 70)
    print(result)