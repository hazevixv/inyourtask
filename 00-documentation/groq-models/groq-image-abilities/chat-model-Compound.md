# Compound - GroqDocs

# Compound

`groq/compound`

[Try it in Playground](/playground?model=groq/compound)

TOKEN SPEED

~450 tps

Powered bygroq

INPUT

Text

OUTPUT

Text

CAPABILITIES

[Web Search](/docs/web-search), [Code Execution](/docs/code-execution), [Visit Website](/docs/visit-website), [Browser Automation](/docs/browser-automation), [Wolfram Alpha](/docs/wolfram-alpha), [JSON Object Mode](/docs/structured-outputs#json-object-mode)

![Groq logo](/_next/image?url=%2Fgroq-circle.png&w=96&q=75)Groq

Groq's Compound system integrates OpenAI's GPT-OSS 120B and Llama 4 models with external tools like web search and code execution. This allows applications to access real-time data and interact with external environments, providing more accurate and current responses than standalone LLMs. Instead of managing separate tools and APIs, Compound systems offer a unified interface that handles tool integration and orchestration, letting you focus on application logic rather than infrastructure complexity.

Rate limits for `groq/compound` are determined by the rate limits of the individual models that comprise them.

This system should not be used by customers for processing protected health information as it is not a HIPAA Covered Cloud Service under Groq's Business Associate Addendum at this time. This system is also not available currently for use with regional / sovereign endpoints.

---

### PRICING

Underlying Model Pricing (per 1M tokens)

Pricing (GPT-OSS-120B)

Input

$0.15

Output

$0.60

Pricing (Llama 4 Scout)

Input

$0.11

Output

$0.34

Built-in Tool Pricing

Basic Web Search

$5 / 1000 requests

Advanced Web Search

$8 / 1000 requests

Visit Website

$1 / 1000 requests

Code Execution

$0.18 / hour

Browser Automation

$0.08 / hour

Wolfram Alpha

Based on your API key from Wolfram, not billed by Groq

Final pricing depends on which underlying models and tools are used for your specific query. See the [Pricing page](https://groq.com/pricing) for more details or the [Compound page](/docs/compound#model-usage-details) for usage breakdowns.

---

### LIMITS

CONTEXT WINDOW

131,072

---

MAX OUTPUT TOKENS

8,192

---

### QUANTIZATION

This uses Groq's TruePoint Numerics, which reduces precision only in areas that don't affect accuracy, preserving quality while delivering significant speedup over traditional approaches. [Learn more here](https://groq.com/blog/inside-the-lpu-deconstructing-groq-speed).

### [Key Technical Specifications](#key-technical-specifications)

### Model Architecture

Compound is powered by [Llama 4 Scout](/docs/model/meta-llama/llama-4-scout-17b-16e-instruct) and [GPT-OSS 120B](/docs/model/openai/gpt-oss-120b) for intelligent reasoning and tool use.

### Performance Metrics

Groq developed a new evaluation benchmark for measuring search capabilities called [RealtimeEval](https://github.com/groq/realtime-eval). This benchmark is designed to evaluate tool-using systems on current events and live data. On the benchmark, Compound outperformed GPT-4o-search-preview and GPT-4o-mini-search-preview significantly.

[

Learn More About Agentic Tooling

Discover how to build powerful applications with real-time web search and code execution

](/docs/compound)

### Use Cases

Realtime Web Search

Automatically access up-to-date information from the web using the built-in web search tool.

Code Execution

Execute Python code automatically using the code execution tool powered by [E2B](https://e2b.dev/).

Code Generation and Technical Tasks

Create AI tools for code generation, debugging, and technical problem-solving with high-quality multilingual support.

### Best Practices

-   Use system prompts to improve steerability and reduce false refusals. Compound is designed to be highly steerable with appropriate system prompts.
-   Consider implementing system-level protections like Llama Guard for input filtering and response validation.
-   Deploy with appropriate safeguards when working in specialized domains or with critical content.
-   Compound should not be used by customers for processing protected health information. It is not a HIPAA Covered Cloud Service under Groq's Business Associate Addendum for customers at this time.

### [Quick Start](#quick-start)

Experience the capabilities of `groq/compound` on Groq:

curlJavaScriptPythonJSON

JSON

```
{
  "model": "groq/compound",
  "messages": [
    {
      "role": "user", 
      "content": "Explain why fast inference is critical for reasoning models"
    }
  ]
}
```

### Was this page helpful?

YesNoSuggest Edits

![](https://www.facebook.com/tr?id=1061407002707012&ev=PageView&noscript=1)

![](https://t.co/1/i/adsct?bci=4&dv=Asia%2FJakarta%26en-US%2Cen%26Google%20Inc.%26Linux%20x86_64%26255%261920%261080%2612%2624%261886%261048%260%26na&eci=3&event=%7B%7D&event_id=6821183a-91a7-4f5b-b3f6-fe804dfbf4fe&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=f685d286-ea3a-4509-9c2c-c3c5003fedd2&pt=Compound%20-%20GroqDocs&tw_document_href=https%3A%2F%2Fconsole.groq.com%2Fdocs%2Fcompound%2Fsystems%2Fcompound&tw_iframe_status=0&tw_pid_src=2&twpid=tw.1772462951415.395356679249519649&txn_id=q6676&type=javascript&version=2.3.38)![](https://analytics.twitter.com/1/i/adsct?bci=4&dv=Asia%2FJakarta%26en-US%2Cen%26Google%20Inc.%26Linux%20x86_64%26255%261920%261080%2612%2624%261886%261048%260%26na&eci=3&event=%7B%7D&event_id=6821183a-91a7-4f5b-b3f6-fe804dfbf4fe&integration=gtm&p_id=Twitter&p_user_id=0&pl_id=f685d286-ea3a-4509-9c2c-c3c5003fedd2&pt=Compound%20-%20GroqDocs&tw_document_href=https%3A%2F%2Fconsole.groq.com%2Fdocs%2Fcompound%2Fsystems%2Fcompound&tw_iframe_status=0&tw_pid_src=2&twpid=tw.1772462951415.395356679249519649&txn_id=q6676&type=javascript&version=2.3.38)<iframe name="__privateStripeMetricsController3580" frameborder="0" allowtransparency="true" scrolling="no" role="presentation" allow="payment *" src="https://js.stripe.com/v3/m-outer-3437aaddcdf6922d623e172c2d6f9278.html#url=https%3A%2F%2Fconsole.groq.com%2Fdocs%2Fcompound%2Fsystems%2Fcompound&amp;title=Compound%20-%20GroqDocs&amp;referrer=https%3A%2F%2Fconsole.groq.com%2Fdashboard%2Fusage%3Ftab%3Dactivity&amp;muid=ba970f43-bd39-45af-b042-a77920046030b54a0c&amp;sid=b8a7dfcd-44a4-4ad8-9720-73b6e49c16ed1fb578&amp;version=6&amp;preview=false&amp;__shared_params__[version]=v3" aria-hidden="true" tabindex="-1" style="border: none !important; margin: 0px !important; padding: 0px !important; width: 1px !important; min-width: 100% !important; overflow: hidden !important; display: block !important; visibility: hidden !important; position: fixed !important; height: 1px !important; pointer-events: none !important; user-select: none !important;"></iframe><iframe id="intercom-frame" style="position: absolute !important; opacity: 0 !important; width: 1px !important; height: 1px !important; top: 0 !important; left: 0 !important; border: none !important; display: block !important; z-index: -1 !important; pointer-events: none;" aria-hidden="true" tabindex="-1" title="Intercom"></iframe>

## Embedded Content