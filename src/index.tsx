import * as React from 'react';
import MoEngine from './mo-engine';

type Replacements = {
  [key: string]: string | number,
}

type TranslateProps = {
  source: string,
  sourcePlural?: string,
  count?: number,
  context?: string,
  replacements?: Replacements,
  domain?: string,
}

const replace = (input: string, replacements: Replacements) => {
  let result = input;

  const replacementKeys = Object.keys(replacements);
  for (let i = 0; i < replacementKeys.length; i += 1) {
    const from = replacementKeys[i];
    const to = replacements[from];
    result = result.split(`{${from}}`)
      .join(`${to}`);
  }

  return result;
};

export interface TranslateEngine {
  translate(
    source: string,
    sourcePlural?: string,
    count?: number,
    context?: string,
    textDomain?: string
  ): string;
}

class MockTranslateEngine implements TranslateEngine {
  // eslint-disable-next-line class-methods-use-this,no-unused-vars
  translate(source: string, sourcePlural?: string, count?: number, context?: string) {
    if (sourcePlural && count !== undefined && (count === 0 || count > 1)) {
      return sourcePlural;
    }

    return source;
  }
}

export interface Translator {
    _(
        source: string,
        context?: string,
        replacements?: Replacements,
        domain?: string,
    ): string
    _n(
        singularSource: string,
        pluralSource?: string,
        count?: number,
        context?: string,
        replacements?: Replacements,
        domain?: string,
    ): string,
    forDomain(domain: string): Translator
}

class TranslationProxy implements Translator {
  engine: any;

  _perDomainCache: { [key: string]: TranslationProxy } = {

  }

  constructor(engine: TranslateEngine) {
    this.engine = engine;
  }

  forDomain(domain: string) {
    if (this._perDomainCache[domain] === undefined) {
      const engine = {
        translate: (
          source: string,
          sourcePlural?: string,
          count?: number,
          context?: string,
          textDomain = domain,
        ) => (
          this.engine.translate(source, sourcePlural, count, context, textDomain)
        ),
      };

      this._perDomainCache[domain] = new TranslationProxy(engine);
    }

    return this._perDomainCache[domain];
  }

  _ = (
    source: string,
    context?: string,
    replacements: Replacements = {},
    domain?: string,
  ) => this._n(source, undefined, undefined, context, replacements, domain)

  _n = (
    singularSource: string,
    pluralSource?: string,
    count?: number,
    context?: string,
    replacements: Replacements = {},
    domain?: string,
  ) => replace(
    this.engine.translate(
      singularSource,
      pluralSource,
      count,
      context,
      domain,
    ),
    replacements,
  )
    .replace(/%d/g, count ? count.toFixed(0) : '')
    .replace(/%f/g, count ? count.toFixed(2) : '');
}

const defaultValue: Translator = new TranslationProxy(new MockTranslateEngine());
const Context: React.Context<Translator> = React.createContext(defaultValue);
export const TranslationContext: React.Consumer<Translator> = Context.Consumer;

export function T(props: TranslateProps) {
  return (
    <Context.Consumer>
      {(engine: Translator) => {
        const { count } = props;
        if (count === undefined || !props.sourcePlural) {
          return engine._(
            props.source,
            props.context,
            props.replacements,
            props.domain,
          );
        }

        return engine._n(
          props.source,
          props.sourcePlural,
          count,
          props.context,
          props.replacements,
          props.domain,
        );
      }}
    </Context.Consumer>
  );
}

type TranslationProviderProps = {
  engine: TranslateEngine,
  children: React.ReactNode,
}

export function TranslationProvider({ engine, children }: TranslationProviderProps) {
  return (
    <Context.Provider value={new TranslationProxy(engine)}>
      {children}
    </Context.Provider>
  );
}

export function withTextDomain<C>(domain: string) {
  return (Component: React.ComponentType<C>) => function withDomain(props: C) {
    return (
      <Context.Consumer>
        {
          engine => (
            <Context.Provider value={engine.forDomain(domain)}>
              <Component {...props} />
            </Context.Provider>
          )
        }
      </Context.Consumer>
    );
  };
}

export function _(
  source: string,
  context?: string,
  replacements: Replacements = {},
  domain?: string,
): React.ReactElement<any> {
  return (
    <T
      source={source}
      context={context}
      replacements={replacements}
      domain={domain}
    />
  );
}

export function _n(
  singularSource: string,
  pluralSource: string,
  count: number,
  context?: string,
  replacements: Replacements = {},
  domain?: string,
): React.ReactElement<any> {
  return (
    <T
      source={singularSource}
      sourcePlural={pluralSource}
      count={count}
      context={context}
      replacements={replacements}
      domain={domain}
    />
  );
}

export {
  MoEngine,
};
