# Detection Studio — escopo inicial

Os templates geram **buscas de hunting**, não regras de detecção persistentes. Nenhuma consulta é executada ou compilada nas plataformas de destino pelo IOC Enricher.

| Plataforma | Modelo usado | Referência oficial |
| --- | --- | --- |
| Microsoft Defender XDR | `DeviceNetworkEvents` para IP/domínio/URL e `DeviceFileEvents` para hashes | [Rede](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicenetworkevents-table), [arquivos](https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-devicefileevents-table) |
| Splunk | Busca textual em eventos brutos, com índice informado pelo analista | [Time modifiers](https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/10.6/time-format-variables-and-modifiers/time-modifiers) |
| Google SecOps | YARA-L 2.0 Search com campos UDM | [Exemplos de Search](https://docs.cloud.google.com/chronicle/docs/yara-l/yara-l-2-0-examples), [campos UDM](https://docs.cloud.google.com/chronicle/docs/reference/udm-field-list) |

Limitações: `RemoteUrl` pode trazer um domínio em vez da URL inteira; `SHA256` em `DeviceFileEvents` pode não estar preenchido; a busca Splunk em `_raw` depende da ingestão local; Google SecOps recebe a janela de tempo no seletor da Search. Cada template apresenta essas ressalvas junto ao resultado. A consulta precisa ser revisada e testada pelo analista na plataforma de destino.
